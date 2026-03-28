import { randomBytes, createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OAuthMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  response_types_supported?: string[];
  scopes_supported?: string[];
};

type ClientRegistration = {
  client_name: string;
  client_uri?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
};

type ClientCredentials = {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

// ─── PKCE ────────────────────────────────────────────────────────────────────

function base64URLEncode(str: Buffer): string {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64URLEncode(hash);
}

function generateState(): string {
  return randomBytes(32).toString("hex");
}

// ─── OAuth Discovery ─────────────────────────────────────────────────────────

export async function discoverOAuthMetadata(
  mcpServerUrl: string,
): Promise<OAuthMetadata> {
  const url = new URL(mcpServerUrl);

  // Step 1: RFC 9470 — Get Protected Resource Metadata
  const protectedResourceResponse = await fetch(
    new URL("/.well-known/oauth-protected-resource", url).toString(),
  );
  if (!protectedResourceResponse.ok) {
    throw new Error(
      `Failed to fetch protected resource metadata: ${protectedResourceResponse.status}`,
    );
  }

  const protectedResource = await protectedResourceResponse.json();
  const authServers = protectedResource.authorization_servers;

  if (!Array.isArray(authServers) || authServers.length === 0) {
    throw new Error(
      "No authorization servers found in protected resource metadata",
    );
  }

  // Step 2: RFC 8414 — Get Authorization Server Metadata
  const metadataResponse = await fetch(
    new URL("/.well-known/oauth-authorization-server", authServers[0]).toString(),
  );
  if (!metadataResponse.ok) {
    throw new Error(
      `Failed to fetch authorization server metadata: ${metadataResponse.status}`,
    );
  }

  const metadata = (await metadataResponse.json()) as OAuthMetadata;

  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error("Missing required OAuth endpoints in metadata");
  }

  if (!metadata.code_challenge_methods_supported?.includes("S256")) {
    console.warn(
      "Server does not advertise S256 PKCE support, but we will use it anyway",
    );
  }

  return metadata;
}

// ─── Client Registration ─────────────────────────────────────────────────────

async function registerClient(
  metadata: OAuthMetadata,
  redirectUri: string,
): Promise<ClientCredentials> {
  if (!metadata.registration_endpoint) {
    throw new Error("Server does not support dynamic client registration");
  }

  const registrationRequest: ClientRegistration = {
    client_name: "Your MCP Client",
    client_uri: "https://example.com",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };

  const response = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(registrationRequest),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Client registration failed: ${response.status} - ${errorBody}`,
    );
  }

  return (await response.json()) as ClientCredentials;
}

// ─── Authorization URL ───────────────────────────────────────────────────────

function buildAuthorizationUrl(
  metadata: OAuthMetadata,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
  scopes: string[] = [],
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });

  return `${metadata.authorization_endpoint}?${params.toString()}`;
}

// ─── Callback Handling ───────────────────────────────────────────────────────

function handleCallback(
  callbackUrl: string,
  storedState: string,
  _codeVerifier: string,
): string {
  const urlParams = new URLSearchParams(new URL(callbackUrl).search);
  const error = urlParams.get("error");

  if (error) {
    const description = urlParams.get("error_description") ?? "Unknown error";
    throw new Error(`OAuth error: ${error} - ${description}`);
  }

  if (urlParams.get("state") !== storedState) {
    throw new Error("Invalid state parameter - possible CSRF attack");
  }

  const code = urlParams.get("code");
  if (!code) {
    throw new Error("Missing authorization code");
  }

  return code;
}

// ─── Token Exchange / Refresh ────────────────────────────────────────────────

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  metadata: OAuthMetadata,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  if (clientSecret) params.append("client_secret", clientSecret);

  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "YourApp-MCP-Client/1.0",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorBody}`);
  }

  const tokens = await response.json();
  if (!tokens.access_token) throw new Error("Missing access_token in response");

  return tokens;
}

async function refreshAccessToken(
  refreshToken: string,
  metadata: OAuthMetadata,
  clientId: string,
  clientSecret: string | undefined,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret) params.append("client_secret", clientSecret);

  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    try {
      const error = JSON.parse(errorBody);
      if (error.error === "invalid_grant") throw new Error("REAUTH_REQUIRED");
      if (error.error === "invalid_client") throw new Error("INVALID_CLIENT");
    } catch {
      // Not a JSON error response
    }

    throw new Error(`Token refresh failed: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

// ─── MCP Client Factory ──────────────────────────────────────────────────────

export async function createMcpClient(
  serverUrl: string,
  accessToken: string,
  useSSE = false,
): Promise<Client> {
  const client = new Client(
    { name: "your-mcp-client", version: "1.0.0" },
    { capabilities: { roots: {}, sampling: {} } },
  );

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "YourApp-MCP-Client/1.0",
  };

  const transport = useSSE
    ? new SSEClientTransport(new URL(`${serverUrl}/sse`), { requestInit: { headers } })
    : new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp`), { requestInit: { headers } });

  await client.connect(transport);
  return client;
}

export async function connectToNotionMcp(accessToken: string): Promise<Client> {
  const serverUrl = "https://mcp.notion.com";
  try {
    return await createMcpClient(serverUrl, accessToken, false);
  } catch (error) {
    console.warn("Streamable HTTP failed, falling back to SSE:", error);
    return await createMcpClient(serverUrl, accessToken, true);
  }
}

// ─── NotionMcpClient ─────────────────────────────────────────────────────────

export class NotionMcpClient {
  private serverUrl = "https://mcp.notion.com";
  private metadata!: OAuthMetadata;
  private clientId!: string;
  private clientSecret?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private client?: Client;
  private storage = new Map<string, string>();

  async initialize(redirectUri: string): Promise<void> {
    this.metadata = await discoverOAuthMetadata(this.serverUrl);
    const credentials = await registerClient(this.metadata, redirectUri);
    this.clientId = credentials.client_id;
    this.clientSecret = credentials.client_secret;
  }

  startAuthFlow(redirectUri: string): string {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    this.storage.set("codeVerifier", codeVerifier);
    this.storage.set("state", state);

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
    const storedState = this.storage.get("state");
    const codeVerifier = this.storage.get("codeVerifier");

    if (!storedState) throw new Error("Missing stored state");
    if (!codeVerifier) throw new Error("Missing stored codeVerifier");

    const code = handleCallback(callbackUrl, storedState, codeVerifier);

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

    this.storage.delete("state");
    this.storage.delete("codeVerifier");
  }

  async connect(): Promise<Client> {
    if (!this.accessToken) throw new Error("Not authenticated");

    try {
      this.client = await createMcpClient(
        this.serverUrl,
        this.accessToken,
        false,
      );
    } catch {
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
    if (!this.refreshToken) throw new Error("No refresh token available");

    try {
      const tokens = await refreshAccessToken(
        this.refreshToken,
        this.metadata,
        this.clientId,
        this.clientSecret,
      );

      this.accessToken = tokens.access_token;
      if (tokens.refresh_token) this.refreshToken = tokens.refresh_token;
    } catch (error) {
      if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
        throw new Error("Re-authentication required");
      }
      throw error;
    }
  }
}