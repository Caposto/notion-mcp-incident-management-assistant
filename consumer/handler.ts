import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebClient } from '@slack/web-api';
import { runAgent } from '../agent/index.ts';
import type { IncidentQueueMessage } from '../queue/types.ts';

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Processes a single incident queue message.
 *
 * Runs the Claude agent with the Notion MCP client, then posts
 * the agent's response back to the originating Slack thread.
 */
export async function handleMessage(message: IncidentQueueMessage, mcpClient: Client): Promise<void> {
  const agentResponse = await runAgent(message.systemPrompt, message.userMessage, mcpClient);

  await slackClient.chat.postMessage({
    channel: message.slackChannel,
    thread_ts: message.slackThreadTs,
    text: agentResponse,
  });
}
