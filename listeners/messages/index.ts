import type { App } from '@slack/bolt';
import { sampleMessageCallback } from './sample-message.ts';

const register = (app: App) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
};

export default { register };
