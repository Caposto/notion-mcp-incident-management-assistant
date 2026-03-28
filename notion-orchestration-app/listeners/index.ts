import type { App } from '@slack/bolt';

import events from './events/index.ts';
import messages from './messages/index.ts';

const registerListeners = (app: App) => {
  events.register(app);
  messages.register(app); // Keep this to smoke test that Bolt app is correctly receiving messages
};

export default registerListeners;
