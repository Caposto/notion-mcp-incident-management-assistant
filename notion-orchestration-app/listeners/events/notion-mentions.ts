import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";

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
  } catch (error) {
    logger.error("Error handling app_mention event:", error);
  }
};

export { notionMentionCallback };
