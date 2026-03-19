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

/**
 * Discovers OAuth configuration for an MCP server using RFC 9470 + RFC 8414.
 */
export async function discoverOAuthMetadata(
  mcpServerUrl: string,
): Promise<OAuthMetadata> {
  const url = new URL(mcpServerUrl);
  const protectedResourceUrl = new URL(
    "/.well-known/oauth-protected-resource",
    url,
  );

  // Step 1: RFC 9470 - Get Protected Resource Metadata
  const protectedResourceResponse = await fetch(
    protectedResourceUrl.toString(),
  );
  if (!protectedResourceResponse.ok) {
    throw new Error(
      `Failed to fetch protected resource metadata: ` +
        `${protectedResourceResponse.status}`,
    );
  }

  const protectedResource = await protectedResourceResponse.json();
  const authServers = protectedResource.authorization_servers;

  if (!Array.isArray(authServers) || authServers.length === 0) {
    throw new Error(
      "No authorization servers found in protected resource metadata",
    );
  }

  // Use the first authorization server
  const authServerUrl = authServers[0];

  // Step 2: RFC 8414 - Get Authorization Server Metadata
  const metadataUrl = new URL(
    "/.well-known/oauth-authorization-server",
    authServerUrl,
  );
  const metadataResponse = await fetch(metadataUrl.toString());

  if (!metadataResponse.ok) {
    throw new Error(
      `Failed to fetch authorization server metadata: ` +
        `${metadataResponse.status}`,
    );
  }

  const metadata = (await metadataResponse.json()) as OAuthMetadata;

  // Validate required fields
  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error("Missing required OAuth endpoints in metadata");
  }

  // Warn if PKCE support isn't advertised
  if (!metadata.code_challenge_methods_supported?.includes("S256")) {
    console.warn(
      "Server does not advertise S256 PKCE support, " +
        "but we will use it anyway",
    );
  }

  return metadata;
}
