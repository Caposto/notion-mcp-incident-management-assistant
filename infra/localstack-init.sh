#!/bin/bash
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "Creating SQS FIFO Dead Letter Queue..."
awslocal sqs create-queue \
  --queue-name incident-dlq.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "false"
  }'

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$ENDPOINT/000000000000/incident-dlq.fifo" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Creating SQS FIFO Queue with DLQ redrive policy..."
awslocal sqs create-queue \
  --queue-name incident-queue.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "false",
    "VisibilityTimeout": "600",
    "RedrivePolicy": "{\"deadLetterTargetArn\": \"'"$DLQ_ARN"'\", \"maxReceiveCount\": 3}"
  }'

echo "SQS FIFO queues created successfully."
awslocal sqs list-queues
