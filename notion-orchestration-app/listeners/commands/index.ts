import type { App } from '@slack/bolt';
import { sampleCommandCallback } from './sample-command.ts';

const register = (app: App) => {
  app.command('/sample-command', sampleCommandCallback);
};

export default { register };
