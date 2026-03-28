/**
 * test-mcp-client.ts — Test the NotionMcpClient class end-to-end
 *
 * Usage:
 *   npx tsx auth/test-mcp-client.ts
 */

import { createServer } from "node:http";
import { exec } from "node:child_process";
import process from "node:process";
import { NotionMcpClient } from "./index.ts";

const CALLBACK_PORT = 9876;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

const client = new NotionMcpClient();

// ─── Initialize (discover + register) ───────────────────────────────────────
console.log("📡 Initializing client (discovery + registration)...");
await client.initialize(REDIRECT_URI);
console.log("   Done.\n");

// ─── Start the auth flow (generates PKCE + builds URL) ──────────────────────
console.log("🔐 Starting auth flow...");
const authUrl = await client.startAuthFlow(REDIRECT_URI);

// ─── Spin up a temporary server to catch the callback ───────────────────────
let resolveCallback: (url: string) => void;
const callbackPromise = new Promise<string>((resolve) => {
  resolveCallback = resolve;
});

let callbackReceived = false;
const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
  if (url.pathname === "/callback" && !callbackReceived) {
    callbackReceived = true;
    resolveCallback(url.toString());
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:#eee">
        <div style="text-align:center"><h1>Authorized!</h1><p>Return to your terminal.</p></div>
      </body></html>
    `);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(CALLBACK_PORT);

// ─── Open the browser ────────────────────────────────────────────────────────
console.log("🌍 Opening browser for authorization...");
console.log(`   If it doesn't open, visit:\n   ${authUrl}\n`);

const openCmd =
  process.platform === "darwin"
    ? `open "${authUrl}"`
    : process.platform === "win32"
      ? `start "" "${authUrl}"`
      : `xdg-open "${authUrl}"`;

exec(openCmd, (err) => {
  if (err) console.log("   ⚠️  Open the URL above manually.");
});

// ─── Wait for the callback, then hand it to the client ──────────────────────
console.log("⏳ Waiting for authorization...");
const callbackUrl = await callbackPromise;
server.close();

console.log("🔄 Exchanging code for tokens...");
await client.handleCallback(callbackUrl, REDIRECT_URI);
console.log("   Tokens received.\n");

// ─── Connect and list tools ──────────────────────────────────────────────────
console.log("🔌 Connecting to Notion MCP...");
const mcpClient = await client.connect();
console.log("   Connected!\n");

console.log("🛠️  Available tools:");
const { tools } = await mcpClient.listTools();
for (const tool of tools) {
  console.log(tool);
}

console.log(`\n✅ Success — ${tools.length} tools available.`);
process.exit(0);