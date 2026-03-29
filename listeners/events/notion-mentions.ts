import type {
  AllMiddlewareArgs,
  EventFromType,
  Logger,
  SayFn,
  SlackEventMiddlewareArgs,
} from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import { notionMcpClient } from "../../app.ts";
import { runAgent } from "../../agent/index.ts";
import { findIncidentByThread } from "../../notion-rest-client/index.ts";
import {
  CREATE_INCIDENT_PROMPT,
  UPDATE_INCIDENT_PROMPT,
  CLOSE_INCIDENT_PROMPT,
} from "../../agent/prompts.ts";

enum Commands {
  CREATE_INCIDENT = "create-incident",
  UPDATE_INCIDENT = "update-incident",
  CLOSE_INCIDENT = "close-incident",
  INVALID = "invalid",
}

const notionMentionCallback = async ({
  event,
  client,
  logger,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  try {
    logger.debug("Received app_mention event:", event);
    const command = validateCommand(event.text);
    const threadTs = event.thread_ts ?? event.ts;

    if (
      !event.thread_ts ||
      !event.text ||
      !command ||
      command === Commands.INVALID
    ) {
      await defaultHandler(event, say);
      return;
    }

    if (command === Commands.CREATE_INCIDENT) {
      await handleCreateIncident(event, threadTs, client, say, logger);
    } else if (command === Commands.UPDATE_INCIDENT) {
      await handleUpdateIncident(event, threadTs, say, logger);
    } else if (command === Commands.CLOSE_INCIDENT) {
      await handleCloseIncident(event, threadTs, say, logger);
    }
  } catch (error) {
    logger.error("Error handling app_mention event:", error);
    await say({
      text: "Something went wrong! Please try again later."
    });
  }
};

// ─── create-incident ────────────────────────────────────────────────

async function handleCreateIncident(
  event: EventFromType<"app_mention">,
  threadTs: string,
  client: WebClient,
  say: SayFn,
  _logger: Logger,
) {
  // 1. Duplicate check
  const existingIncident = await findIncidentByThread(threadTs);
  if (existingIncident) {
    await say({
      text: `An incident page already exists for this thread: ${existingIncident}`,
      thread_ts: threadTs,
    });
    return;
  }

  // 2. Let the user know we're working on it (Slack best practice — respond fast)
  await say({
    text: "🔍 Creating incident page... Searching for service info, runbooks, and past incidents.",
    thread_ts: threadTs,
  });

  // 3. Strip the bot mention and command from the message to get the details
  const details = event.text
    .replace(/<@[A-Z0-9]+>/g, "") // remove bot mention
    .replace(/create-incident/i, "") // remove command
    .trim();

  // 4. Fetch the parent alert message from the thread
  const alertContext = await fetchAlertContext(client, event.channel, threadTs);

  // 5. Build the user message with all the context the agent needs
  const userMessage = `Create an incident page with the following context:

  **Alert title:** ${alertContext.title ?? "N/A"}
  **Alert name:** ${alertContext.alertName ?? "N/A"}
  **Rule name:** ${alertContext.ruleName ?? "N/A"}
  **Runbook URL:** ${alertContext.runbookUrl ?? "N/A"}
  **Details from engineer:** ${details || "No additional details provided"}
  **Slack Thread ID:** ${threadTs}
  **Slack Channel:** ${event.channel}
  **Commander:** <@${event.user}>
  **Current time (UTC):** ${new Date().toISOString()}

  Search for relevant service info, runbooks, and past incidents, then create the incident page.`;

  // 6. Run the agent — Claude decides which tools to call
  const agentResponse = await runAgent(
    CREATE_INCIDENT_PROMPT,
    userMessage,
    notionMcpClient,
  );

  // 7. Post the agent's summary back to Slack
  await say({
    text: agentResponse,
    thread_ts: threadTs,
  });
}

// ─── update-incident ────────────────────────────────────────────────

async function handleUpdateIncident(
  event: EventFromType<"app_mention">,
  threadTs: string,
  say: SayFn,
  _logger: Logger,
) {
  // 1. Find the incident page
  const incidentPageId = await findIncidentByThread(threadTs);
  if (!incidentPageId) {
    await say({
      text: "No incident found for this thread. Use `create-incident` first.",
      thread_ts: threadTs,
    });
    return;
  }

  // 2. Strip the command to get the update text
  const updateText = event.text
    .replace(/<@[A-Z0-9]+>/g, "")
    .replace(/update-incident/i, "")
    .trim();

  const userMessage = `Update the incident page with ID ${incidentPageId} with the following update from the engineer: "${updateText}". The update is happening at ${new Date().toISOString()}.`

  const _agentResponse = await runAgent(
    UPDATE_INCIDENT_PROMPT,
    userMessage,
    notionMcpClient,
  );

  await say({
    text: `Update incident received: "${updateText}" — agent integration coming soon.`,
    thread_ts: threadTs,
  });
}

// ─── close-incident ─────────────────────────────────────────────────

async function handleCloseIncident(
  _event: EventFromType<"app_mention">,
  threadTs: string,
  say: SayFn,
  _logger: Logger,
) {
  // 1. Find the incident page
  const incidentPageId = await findIncidentByThread(threadTs);
  if (!incidentPageId) {
    await say({
      text: "No incident found for this thread. Use `create-incident` first.",
      thread_ts: threadTs,
    });
    return;
  }

  const userMessage = `Close the incident page with ID ${incidentPageId}. The closure request is coming at ${new Date().toISOString()}.`

  const _agentResponse = await runAgent(
    CLOSE_INCIDENT_PROMPT,
    userMessage,
    notionMcpClient,
  );

  await say({
    text: `Close incident received — agent integration coming soon.`,
    thread_ts: threadTs,
  });
}

// ─── Shared helpers ─────────────────────────────────────────────────

interface AlertContext {
  title: string | null;
  alertName: string | null;
  ruleName: string | null;
  runbookUrl: string | null;
}

async function fetchAlertContext(
  client: WebClient,
  channel: string,
  threadTs: string,
): Promise<AlertContext> {
  const empty: AlertContext = { title: null, alertName: null, ruleName: null, runbookUrl: null };

  try {
    const result = await client.conversations.replies({
      channel,
      ts: threadTs,
      limit: 1,
      inclusive: true,
    });

    const parentMessage = result.messages?.[0];
    const attachment = parentMessage?.attachments?.[0];
    if (!attachment) return empty;

    const text = attachment.text ?? "";

    return {
      title: attachment.title ?? null,
      alertName: text.match(/alertname\s*=\s*(.+)/)?.[1]?.trim() ?? null,
      ruleName: text.match(/rulename\s*=\s*(.+)/)?.[1]?.trim() ?? null,
      runbookUrl: text.match(/runbook_url\s*=\s*<?([^>\s]+)/)?.[1]?.trim() ?? null,
    };
  } catch {
    return empty;
  }
}

async function defaultHandler(event: EventFromType<"app_mention">, say: SayFn) {
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
