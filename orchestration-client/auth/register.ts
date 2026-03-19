import { type OAuthMetadata } from "./discover.ts";

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

export async function registerClient(
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

  const credentials = (await response.json()) as ClientCredentials;

  // Store credentials securely
  return credentials;
}
