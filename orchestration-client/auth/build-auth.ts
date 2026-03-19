import { randomBytes } from "node:crypto";
import { type OAuthMetadata } from "./discover.ts";

export function buildAuthorizationUrl(
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
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });

  return `${metadata.authorization_endpoint}?${params.toString()}`;
}

export function generateState(): string {
  return randomBytes(32).toString("hex");
}
