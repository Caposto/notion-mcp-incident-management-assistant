import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { NotionMcpClient } from "../../auth/index.ts";
import { createServer } from "node:http";

const notionMentionCallback = async ({
  event,
  context,
  client,
  logger,
  say
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  try {
    logger.debug("Received app_mention event:", event);

    // TODO: Have a default mention if bot is invoked outside of a thread
    // TODO: Have message if bot is invoked in a thread, but not a valid command. List commands
    await say({ text: `Hello <@${event.user}>! You mentioned me in a message. How can I assist you with Notion?`, thread_ts: event.thread_ts ?? event.ts });

    const client = new NotionMcpClient();
    const CALLBACK_PORT = 9876;
    const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
    await client.initialize(REDIRECT_URI);
    const authUrl = await client.startAuthFlow(REDIRECT_URI);
    await say({ text: `To get started, please authenticate with Notion by visiting this URL: ${authUrl}`, thread_ts: event.thread_ts ?? event.ts });
    let resolveCallback: (url: string) => void;
    const callbackPromise = new Promise<string>((resolve) => {
      resolveCallback = resolve;
    });
    
    let callbackReceived = false; // TODO: Spin callback server up at app initialization and reuse it for all auth flows instead of spinning up a new one for each auth flow
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
    const callbackUrl = await callbackPromise;
    await client.handleCallback(callbackUrl, REDIRECT_URI);
    const mcpClient = await client.connect();
    const result = await mcpClient.callTool({
      name: "notion-create-pages",
      arguments: {
        pages: [
          {
            properties: { title: "Incident MCP Test" },
            content: "## Summary\nThis is a test incident page created via the Notion MCP.\n\n## Details\nThe quick brown fox jumps over the lazy dog.",
          },
        ],
      },
    });
    const resultText = result.content[0]?.type === "text" ? result.content[0].text : JSON.stringify(result);
    await say({ text: `Notion page created: ${resultText}`, thread_ts: event.thread_ts ?? event.ts });
  } catch (error) {
    logger.error("Error handling app_mention event:", error);
  }
};

export { notionMentionCallback };
