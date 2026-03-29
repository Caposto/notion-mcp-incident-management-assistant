export interface IncidentQueueMessage {
  command: 'create-incident' | 'update-incident' | 'close-incident';
  userMessage: string;
  systemPrompt: string;
  slackChannel: string;
  slackThreadTs: string;
  slackUser: string | undefined;
  timestamp: string;
}
