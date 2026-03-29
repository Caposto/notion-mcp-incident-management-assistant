import { DeleteMessageCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { IncidentQueueMessage } from './types.ts';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.SQS_ENDPOINT ?? 'http://localhost:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

const QUEUE_URL = process.env.SQS_QUEUE_URL ?? 'http://localhost:4566/000000000000/incident-queue.fifo';

export async function sendMessage(message: IncidentQueueMessage): Promise<string | undefined> {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: message.slackThreadTs,
    MessageDeduplicationId: `${message.slackThreadTs}-${message.command}-${message.timestamp}`,
  });

  const result = await sqsClient.send(command);
  return result.MessageId;
}

export async function receiveMessages(maxMessages = 1, waitTimeSeconds = 20) {
  const command = new ReceiveMessageCommand({
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: waitTimeSeconds,
    MessageAttributeNames: ['All'],
  });

  const result = await sqsClient.send(command);
  return result.Messages ?? [];
}

export async function deleteMessage(receiptHandle: string) {
  const command = new DeleteMessageCommand({
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle,
  });

  await sqsClient.send(command);
}
