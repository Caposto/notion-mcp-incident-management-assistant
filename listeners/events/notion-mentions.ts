import type { AllMiddlewareArgs, EventFromType, Logger, SayFn, SlackEventMiddlewareArgs } from '@slack/bolt';
import { CLOSE_INCIDENT_PROMPT, CREATE_INCIDENT_PROMPT, UPDATE_INCIDENT_PROMPT } from '../../agent/prompts.ts';
import { findIncidentByThread } from '../../notion-rest-client/index.ts';
import { sendMessage } from '../../queue/sqs-client.ts';
import type { IncidentQueueMessage } from '../../queue/types.ts';

enum Commands {
  CREATE_INCIDENT = 'create-incident',
  UPDATE_INCIDENT = 'update-incident',
  CLOSE_INCIDENT = 'close-incident',
  INVALID = 'invalid',
}

const notionMentionCallback = async ({
  event,
  logger,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>) => {
  try {
    logger.debug('Received app_mention event:', event);
    const command = validateCommand(event.text);
    const threadTs = event.thread_ts ?? event.ts;

    if (!event.thread_ts || !event.text || !command || command === Commands.INVALID) {
      await defaultHandler(event, say);
      return;
    }

    if (command === Commands.CREATE_INCIDENT) {
      await handleCreateIncident(event, threadTs, say, logger);
    } else if (command === Commands.UPDATE_INCIDENT) {
      await handleUpdateIncident(event, threadTs, say, logger);
    } else if (command === Commands.CLOSE_INCIDENT) {
      await handleCloseIncident(event, threadTs, say, logger);
    }
  } catch (error) {
    logger.error('Error handling app_mention event:', error);
    await say({
      text: 'Something went wrong! Please try again later.',
    });
  }
};

// ─── create-incident ────────────────────────────────────────────────

async function handleCreateIncident(event: EventFromType<'app_mention'>, threadTs: string, say: SayFn, logger: Logger) {
  // 1. Duplicate check
  const existingIncident = await findIncidentByThread(threadTs);
  if (existingIncident) {
    await say({
      text: `An incident page already exists for this thread: ${existingIncident}`,
      thread_ts: threadTs,
    });
    return;
  }

  // 2. Strip the bot mention and command from the message to get the details
  const details = event.text
    .replace(/<@[A-Z0-9]+>/g, '')
    .replace(/create-incident/i, '')
    .trim();

  // 3. Build the user message with all the context the agent needs
  const userMessage = `Create an incident page with the following context:

  **Details from engineer:** ${details || 'No additional details provided'}
  **Slack Thread ID:** ${threadTs}
  **Slack Channel:** ${event.channel}
  **Commander:** <@${event.user}>
  **Current time (UTC):** ${new Date().toISOString()}

  Search for relevant service info, runbooks, and past incidents, then create the incident page.`;

  // 4. Enqueue for async processing
  const message: IncidentQueueMessage = {
    command: Commands.CREATE_INCIDENT,
    userMessage,
    systemPrompt: CREATE_INCIDENT_PROMPT,
    slackChannel: event.channel,
    slackThreadTs: threadTs,
    slackUser: event.user,
    timestamp: new Date().toISOString(),
  };

  const messageId = await sendMessage(message);
  logger.info(`Enqueued create-incident message: ${messageId}`);

  // 5. Ack to Slack immediately
  await say({
    text: "🔍 Creating incident page... Searching for service info, runbooks, and past incidents. You'll be notified when it's ready.",
    thread_ts: threadTs,
  });
}

// ─── update-incident ────────────────────────────────────────────────

async function handleUpdateIncident(event: EventFromType<'app_mention'>, threadTs: string, say: SayFn, logger: Logger) {
  // 1. Find the incident page
  const incidentPageId = await findIncidentByThread(threadTs);
  if (!incidentPageId) {
    await say({
      text: 'No incident found for this thread. Use `create-incident` first.',
      thread_ts: threadTs,
    });
    return;
  }

  // 2. Strip the command to get the update text
  const updateText = event.text
    .replace(/<@[A-Z0-9]+>/g, '')
    .replace(/update-incident/i, '')
    .trim();

  const userMessage = `Update the incident page with ID ${incidentPageId} with the following update from the engineer: "${updateText}". The update is happening at ${new Date().toISOString()}.`;

  // 3. Enqueue for async processing
  const message: IncidentQueueMessage = {
    command: Commands.UPDATE_INCIDENT,
    userMessage,
    systemPrompt: UPDATE_INCIDENT_PROMPT,
    slackChannel: event.channel,
    slackThreadTs: threadTs,
    slackUser: event.user,
    timestamp: new Date().toISOString(),
  };

  const messageId = await sendMessage(message);
  logger.info(`Enqueued update-incident message: ${messageId}`);

  await say({
    text: `Update received: "${updateText}" — processing in the background.`,
    thread_ts: threadTs,
  });
}

// ─── close-incident ─────────────────────────────────────────────────

async function handleCloseIncident(event: EventFromType<'app_mention'>, threadTs: string, say: SayFn, logger: Logger) {
  // 1. Find the incident page
  const incidentPageId = await findIncidentByThread(threadTs);
  if (!incidentPageId) {
    await say({
      text: 'No incident found for this thread. Use `create-incident` first.',
      thread_ts: threadTs,
    });
    return;
  }

  const userMessage = `Close the incident page with ID ${incidentPageId}. The closure request is coming at ${new Date().toISOString()}.`;

  // 2. Enqueue for async processing
  const message: IncidentQueueMessage = {
    command: Commands.CLOSE_INCIDENT,
    userMessage,
    systemPrompt: CLOSE_INCIDENT_PROMPT,
    slackChannel: event.channel,
    slackThreadTs: threadTs,
    slackUser: event.user,
    timestamp: new Date().toISOString(),
  };

  const messageId = await sendMessage(message);
  logger.info(`Enqueued close-incident message: ${messageId}`);

  await say({
    text: 'Close incident received — processing in the background.',
    thread_ts: threadTs,
  });
}

// ─── Shared helpers ─────────────────────────────────────────────────

async function defaultHandler(event: EventFromType<'app_mention'>, say: SayFn) {
  await say({
    text: `Hello <@${event.user}>! Please call me in an alert thread to execute commands related to incident management in Notion. Here are the commands you can use:
    \n*Create Incident:* \`@bot create-incident {initial details: severity, logs, etc.}\`
    \n*Update Incident:* \`@bot update-incident {what changed, actions taken, teams paged}\`
    \n*Close Incident:* \`@bot close-incident\``,
    thread_ts: event.thread_ts ?? event.ts,
  });
}

function validateCommand(text: string): string {
  for (const command of Object.values(Commands)) {
    if (text.includes(command)) {
      return command;
    }
  }
  return Commands.INVALID;
}

export { notionMentionCallback };
