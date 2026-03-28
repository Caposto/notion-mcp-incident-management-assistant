import type { AllMiddlewareArgs, EventFromType, SayFn, SlackEventMiddlewareArgs } from "@slack/bolt";
import { notionMcpClient } from "../../app.ts";

// Handlers:
// Default message - Explains list of valid @ commands and format
// @create-incident - Creates a new incident page in Notion with the provided details
// Tools: notion-create-pages, notion-search (for runbooks, etc)
// @update-incident - Updates an existing incident page in Notion with the provided details. Captures timestamp 
// Tools: notion-update-page, notion-create-comment
// @close-incident - Closes an existing incident page in Notion, kicks of post-incident workflow (RCA, Jira Ticket Generation, database updates etc)
// Tools: notion-update-page, notion-create-comment, notion-search (for RCA templates, etc), notion-create-pages

enum Commands {
  CREATE_INCIDENT = "create-incident",
  UPDATE_INCIDENT = "update-incident",
  CLOSE_INCIDENT = "close-incident",
  INVALID = "invalid",
}

const notionMentionCallback = async ({
  event,
  context,
  client,
  logger,
  say
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  try {
    logger.debug("Received app_mention event:", event);
    const command = validateCommand(event.text);

    if (!event.thread_ts || !event.text || !command || command === Commands.INVALID) {
      await defaultHandler(event, say);
      logger.debug("Handled app_mention with default handler.");
    } else if (command === Commands.CREATE_INCIDENT) {
      const result = await notionMcpClient.callTool({
        name: "notion-create-pages",
        arguments: {
          pages: [
            {
              properties: { title: "Incident MCP Test #2" },
              content:
                "## Summary\nThis is a test incident page created via the Notion MCP.\n\n## Details\nThe quick brown fox jumps over the lazy dog.",
            },
          ],
        },
      });
      const resultText =
        result.content[0]?.type === "text"
          ? result.content[0].text
          : JSON.stringify(result);
      await say({
        text: `Notion page created: ${resultText}`,
        thread_ts: event.thread_ts ?? event.ts,
      });
    } else if (command === Commands.UPDATE_INCIDENT) {
      await say({
        text: `Update incident command received with details: ${event.text}`,
        thread_ts: event.thread_ts ?? event.ts,
      });
    } else if (command === Commands.CLOSE_INCIDENT) {
      await say({
        text: `Close incident command received with details: ${event.text}`,
        thread_ts: event.thread_ts ?? event.ts,
      });
    }
  } catch (error) {
    logger.error("Error handling app_mention event:", error);
  }
};

async function defaultHandler(event: EventFromType<"app_mention">, say: SayFn) {
  await say({
    text: `Hello <@${event.user}>! Please call me in an alert thread to execute commands related to incident management in Notion. Here are the commands you can use: 
    \nCreate Incident: @notion-orchestration-app create-incident <severity> <details> 
    \nUpdate Incident: @notion-orchestration-app update-incident <updated_details>
    \nClose Incident: @notion-orchestration-app close-incident`,
    thread_ts: event.thread_ts ?? event.ts,
  });
}

// TODO: Create an incident DB in Notion that has the thread as the incident ID and an open/close status property. When a command is received, check if the thread has an open incident page in Notion and route the command accordingly. If no open incident page exists for the thread, only allow the create-incident command to be executed. If an open incident page does exist, allow update-incident and close-incident commands to be executed and have them update the incident page in Notion accordingly. This will ensure that updates and closes are always associated with an existing incident page in Notion and prevent orphaned updates or closes that aren't associated with any incident.

// Handle parsing the command and its details from the message text
function validateCommand(text: string): string {
  for (const command of Object.values(Commands)) {
    if (text.includes(command)) {
      return command;
    }
  }
  return Commands.INVALID;
}

export { notionMentionCallback };
