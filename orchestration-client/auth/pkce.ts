import { randomBytes, createHash } from "node:crypto";
import { Buffer } from "node:buffer";

function base64URLEncode(str: Buffer): string {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateCodeVerifier(): string {
  // Generate 32 random bytes = 256 bits
  // Base64 encoding produces ~43 characters
  const bytes = randomBytes(32);
  return base64URLEncode(bytes);
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64URLEncode(hash);
}
