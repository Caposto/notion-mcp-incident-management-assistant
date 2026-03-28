import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { notionMcpClient } from "../../app.ts";

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

    const result = await notionMcpClient.callTool({
      name: "notion-create-pages",
      arguments: {
        pages: [
          {
            properties: { title: "Incident MCP Test #2" },
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
