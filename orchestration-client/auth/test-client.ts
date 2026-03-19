/**
 * test-client.ts — Test the NotionMcpClient class end-to-end
 *
 * Usage:
 *   deno run --allow-net --allow-run test-client.ts
 */

import { NotionMcpClient } from "./mcp-client.ts";

const CALLBACK_PORT = 9876;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

const client = new NotionMcpClient();

// ─── Initialize (discover + register) ───────────────────────────────
console.log("📡 Initializing client (discovery + registration)...");
await client.initialize(REDIRECT_URI);
console.log("   Done.\n");

// ─── Start the auth flow (generates PKCE + builds URL) ──────────────
console.log("🔐 Starting auth flow...");
const authUrl = await client.startAuthFlow(REDIRECT_URI);

// ─── Spin up a temporary server to catch the callback ───────────────
const { promise: callbackPromise, resolve: resolveCallback } =
  Promise.withResolvers<string>();

const server = Deno.serve({ port: CALLBACK_PORT }, (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname === "/callback") {
    resolveCallback(req.url);
    return new Response(
      `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:#eee">
        <div style="text-align:center"><h1>✅ Authorized!</h1><p>Return to your terminal.</p></div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }
  return new Response("Not found", { status: 404 });
});

// ─── Open the browser ───────────────────────────────────────────────
console.log("🌍 Opening browser for authorization...");
console.log(`   If it doesn't open, visit:\n   ${authUrl}\n`);

try {
  const os = Deno.build.os;
  const cmd =
    os === "darwin"
      ? ["open", authUrl]
      : os === "windows"
        ? ["cmd", "/c", "start", authUrl]
        : ["xdg-open", authUrl];
  await new Deno.Command(cmd[0], { args: cmd.slice(1) }).output();
} catch {
  console.log("   ⚠️  Open the URL above manually.");
}

// ─── Wait for the callback, then hand it to the client ──────────────
console.log("⏳ Waiting for authorization...");
const callbackUrl = await callbackPromise;
await server.shutdown();

console.log("🔄 Exchanging code for tokens...");
await client.handleCallback(callbackUrl, REDIRECT_URI);
console.log("   Tokens received.\n");

// ─── Connect and list tools ─────────────────────────────────────────
console.log("🔌 Connecting to Notion MCP...");
const mcpClient = await client.connect();
console.log("   Connected!\n");

console.log("🛠️  Available tools:");
const { tools } = await mcpClient.listTools();
for (const tool of tools) {
  console.log(`   • ${tool.name}`);
}

console.log(`\n✅ Success — ${tools.length} tools available.`);
Deno.exit(0);
