import { type OAuthMetadata } from "./discover.ts";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  metadata: OAuthMetadata,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  if (clientSecret) {
    params.append("client_secret", clientSecret);
  }

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

  if (!tokens.access_token) {
    throw new Error("Missing access_token in response");
  }

  return tokens;
}

export async function refreshAccessToken(
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

  if (clientSecret) {
    params.append("client_secret", clientSecret);
  }

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
      if (error.error === "invalid_grant") {
        throw new Error("REAUTH_REQUIRED");
      }
      if (error.error === "invalid_client") {
        throw new Error("INVALID_CLIENT");
      }
    } catch (parseError) {
      // Not JSON error response
    }

    throw new Error(`Token refresh failed: ${response.status} - ${errorBody}`);
  }

  const tokens = await response.json();

  return tokens;
}