import type { App } from '@slack/bolt';

import actions from './actions/index.ts';
import commands from './commands/index.ts';
import events from './events/index.ts';
import messages from './messages/index.ts';
import shortcuts from './shortcuts/index.ts';
import views from './views/index.ts';

const registerListeners = (app: App) => {
  actions.register(app);
  commands.register(app);
  events.register(app);
  messages.register(app);
  shortcuts.register(app);
  views.register(app);
};

export default registerListeners;
