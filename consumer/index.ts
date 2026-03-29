import 'dotenv/config';
import { createServer } from 'node:http';
import process from 'node:process';
import { NotionMcpClient } from '../notion-mcp-client/index.ts';
import { deleteMessage, receiveMessages } from '../queue/sqs-client.ts';
import type { IncidentQueueMessage } from '../queue/types.ts';
import { handleMessage } from './handler.ts';

const CALLBACK_PORT = Number(process.env.CALLBACK_PORT) || 9876;
const REDIRECT_URI = process.env.REDIRECT_URI ?? `http://localhost:${CALLBACK_PORT}/callback`;

let running = true;

async function initMcpClient() {
  const client = new NotionMcpClient();
  await client.initialize(REDIRECT_URI);
  const authUrl = await client.startAuthFlow(REDIRECT_URI);
  console.log(`📡 Please complete the Notion MCP authorization in your browser: ${authUrl}`);

  let resolveCallback: (url: string) => void;
  const callbackPromise = new Promise<string>((resolve) => {
    resolveCallback = resolve;
  });

  let callbackReceived = false;
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${CALLBACK_PORT}`);
    if (url.pathname === '/callback' && !callbackReceived) {
      callbackReceived = true;
      resolveCallback(url.toString());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:#eee">
          <div style="text-align:center"><h1>Authorized!</h1><p>Return to your terminal.</p></div>
        </body></html>
      `);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(CALLBACK_PORT);
  const callbackUrl = await callbackPromise;
  await client.handleCallback(callbackUrl, REDIRECT_URI);
  const mcpClient = await client.connect();
  server.close();
  console.log('✅ Notion MCP Client connected and ready.');
  return mcpClient;
}

async function pollQueue(mcpClient: Awaited<ReturnType<typeof initMcpClient>>) {
  console.log('📨 Consumer polling for messages...');

  while (running) {
    try {
      const messages = await receiveMessages(1, 20);

      for (const sqsMessage of messages) {
        if (!sqsMessage.Body || !sqsMessage.ReceiptHandle) continue;

        const body: IncidentQueueMessage = JSON.parse(sqsMessage.Body);
        console.log(`Processing ${body.command} for thread ${body.slackThreadTs}`);

        try {
          await handleMessage(body, mcpClient);
          await deleteMessage(sqsMessage.ReceiptHandle);
          console.log(`✅ Processed ${body.command} for thread ${body.slackThreadTs}`);
        } catch (error) {
          console.error(`❌ Failed to process ${body.command} for thread ${body.slackThreadTs}:`, error);
          // Don't delete — SQS will retry, then send to DLQ after maxReceiveCount
        }
      }
    } catch (error) {
      console.error('Error polling SQS:', error);
      // Brief pause before retrying on poll errors
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function main() {
  const mcpClient = await initMcpClient();
  await pollQueue(mcpClient);
}

process.on('SIGINT', () => {
  console.log('\nShutting down consumer...');
  running = false;
});

process.on('SIGTERM', () => {
  console.log('\nShutting down consumer...');
  running = false;
});

main().catch((error) => {
  console.error('Consumer failed to start:', error);
  process.exit(1);
});
