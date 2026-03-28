import type { App } from '@slack/bolt';

import events from './events/index.ts';
import messages from './messages/index.ts';

const registerListeners = (app: App) => {
  events.register(app);
  messages.register(app);
};

export default registerListeners;
