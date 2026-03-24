import type { App } from '@slack/bolt';
import { sampleViewCallback } from './sample-view.ts';

const register = (app: App) => {
  app.view('sample_view_id', sampleViewCallback);
};

export default { register };
