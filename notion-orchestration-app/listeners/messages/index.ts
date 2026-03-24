import type { App } from '@slack/bolt';
import { sampleMessageCallback } from './sample-message.ts';
import { grafanaAlertCallback } from './grafana-alert.ts';

const register = (app: App) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
  app.event("message", grafanaAlertCallback);
};

export default { register };
