import { App, LogLevel } from '@slack/bolt';
import 'dotenv/config';
import process from 'node:process';
import registerListeners from './listeners/index.ts';

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

/** Start Bolt App */
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    app.logger.info('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    app.logger.error('Unable to start App', error);
  }
})();
