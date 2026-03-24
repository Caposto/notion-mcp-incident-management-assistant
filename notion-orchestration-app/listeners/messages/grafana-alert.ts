import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";

const grafanaAlertCallback = async ({
  message,
  logger,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  // Grafana webhook posts arrive as bot_message subtype
  if (message.subtype !== "bot_message") {
    logger.info("Non-bot message received, ignoring", message);
    return;
  }

  // Grafana's bot username — check your actual webhook messages to confirm
  if (!("username" in message) || message.username !== "Grafana") {
    logger.info("Message is not from Grafana, ignoring", message);
    return;
  }

  try {
    logger.info("Grafana alert received", message);
    // message.text contains the alert summary
    // message.attachments contains structured alert data (title, fields, color, etc.)
  } catch (error) {
    logger.error(error);
  }
};

export { grafanaAlertCallback };
