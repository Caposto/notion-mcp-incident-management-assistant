import { App, LogLevel } from '@slack/bolt';
import 'dotenv/config';
import registerListeners from './listeners/index.ts';
import process from "node:process";
import { createServer } from "node:http";
import { NotionMcpClient } from "./auth/index.ts";

/** Slack App Initialization */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
  ignoreSelf: false,
});


app.error(async (error) => {
  app.logger.error('Global error:', error);
});

/** Register Listeners */
registerListeners(app);

/** Notion MCP Client Initialization */
// TODO: Is there a cleaner and more secure way to handle this client initializastion and auth flow?
// Future Improvement: MCP Gateway like https://github.com/obot-platform/obot
const client = new NotionMcpClient();
const CALLBACK_PORT = 9876;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
await client.initialize(REDIRECT_URI);
const authUrl = await client.startAuthFlow(REDIRECT_URI);
app.logger.info(`📡 Please complete the Notion MCP authorization in your browser: ${authUrl}`);
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
const callbackUrl = await callbackPromise;
await client.handleCallback(callbackUrl, REDIRECT_URI);
const notionMcpClient = await client.connect();
app.logger.info("Notion MCP Client connected and ready to use.");

/** Start Bolt App and Callback Server */
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    app.logger.info('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    app.logger.error('Unable to start App', error);
  }
})();

export { notionMcpClient };