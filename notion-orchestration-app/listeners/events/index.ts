import type { App } from "@slack/bolt";
import { notionMentionCallback  } from "./notion-mentions.ts";

const register = (app: App) => {
  app.event('app_mention', notionMentionCallback);
};

export default { register };
