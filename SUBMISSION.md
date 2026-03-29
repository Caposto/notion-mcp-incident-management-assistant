*This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)*

## What I Built
<!-- Provide a description of your project. -->

## Video Demo
<!-- Share a video walkthrough of your workflow in action -->

## Show us the code
<!-- Embed or share a link to your code repo. -->

## How I Used Notion MCP

At first I was linking specific tool calls to specific slack commands, but I realized
that I was basically calling the standard Notion API with extra steps. My slack bot
is a simple orchestration layer/chat interface. I let Claude decide what tools to use,
guiding it with the context of the slack commands and existing templates in the 
Notion workspace.
<!-- Explain how you integrated Notion MCP and what it unlocks in your workflow or system. -->

<!-- Don't forget to add a cover image (if you want). -->
Billing details:
~ $0.36 cents for create-incident command

<!-- Team Submissions: Please pick one member to publish the submission and credit teammates by listing their DEV usernames directly in the body of the post. -->

<!-- Thanks for participating! -->

Future improvements: 
- Queries are expensive. Create incident took around 6 minutes to run
- Decouple the Slack events from the agent executions. Slack app parses and places commands in a FIFO Queue
- Agent lambda consumes from the queue and executes Notion MCP actions
- Use a MCP Gateway if using multiple MCPs (Jira, Grafana, etc)
- TODO: Can we optimize Claude agent? Shorter prompts to use less tokens. Ensure the agent is only being declared once if that matters
- Amazon Macie and other filter to remove PII information from agents
- "Reconciliation service" dump other peoples notes at the end to reconcile