import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { discoverOAuthMetadata, type OAuthMetadata } from "./discover.ts";
import { generateCodeChallenge, generateCodeVerifier } from "./pkce.ts";
import { registerClient } from "./register.ts";
import { buildAuthorizationUrl, generateState } from "./build-auth.ts";
import { handleCallback } from "./callback.ts";
import { exchangeCodeForTokens, refreshAccessToken } from "./tokens.ts";
import { createMcpClient } from "./create-client.ts";

export class NotionMcpClient {
  private serverUrl = "https://mcp.notion.com";
  private metadata!: OAuthMetadata;
  private clientId!: string;
  private clientSecret?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private client?: Client;

  async initialize(redirectUri: string): Promise<void> {
    this.metadata = await discoverOAuthMetadata(this.serverUrl);
    const credentials = await registerClient(this.metadata, redirectUri);
    this.clientId = credentials.client_id;
    this.clientSecret = credentials.client_secret;
  }

  async startAuthFlow(redirectUri: string): Promise<string> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store these securely
    this.storeSecurely("codeVerifier", codeVerifier);
    this.storeSecurely("state", state);

    return buildAuthorizationUrl(
      this.metadata,
      this.clientId,
      redirectUri,
      codeChallenge,
      state,
    );
  }

  async handleCallback(
    callbackUrl: string,
    redirectUri: string,
  ): Promise<void> {
    const storedState = this.retrieveSecurely("state");
    const codeVerifier = this.retrieveSecurely("codeVerifier");

    console.log("Stored state:", storedState);
    const urlState = new URL(callbackUrl).searchParams.get("state");
    console.log("Callback state:", urlState);

    const code = await handleCallback(callbackUrl, storedState, codeVerifier);

    const tokens = await exchangeCodeForTokens(
      code,
      codeVerifier,
      this.metadata,
      this.clientId,
      this.clientSecret,
      redirectUri,
    );

    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    // Clean up stored values
    this.deleteSecurely("state");
    this.deleteSecurely("codeVerifier");
  }

  async connect(): Promise<Client> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      this.client = await createMcpClient(
        this.serverUrl,
        this.accessToken,
        false,
      );
    } catch (error) {
      console.warn("Streamable HTTP failed, falling back to SSE");
      this.client = await createMcpClient(
        this.serverUrl,
        this.accessToken,
        true,
      );
    }

    return this.client;
  }

  async ensureValidToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const tokens = await refreshAccessToken(
        this.refreshToken,
        this.metadata,
        this.clientId,
        this.clientSecret,
      );

      this.accessToken = tokens.access_token;
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
        throw new Error("Re-authentication required");
      }
      throw error;
    }
  }

  private storage = new Map<string, string>();

  private storeSecurely(key: string, value: string): void {
    this.storage.set(key, value);
  }

  private retrieveSecurely(key: string): string {
    const value = this.storage.get(key);
    if (!value) throw new Error(`Missing stored value for key: ${key}`);
    return value;
  }

  private deleteSecurely(key: string): void {
    this.storage.delete(key);
  }
}
