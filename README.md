# Relay - Incident Management Assistant

An AI-powered incident management assistant that connects Slack and Notion via the Model Context Protocol (MCP). Engineers can create, update, and close incidents directly from Slack — a Claude agent handles the heavy lifting, automatically generating structured incident pages, timelines, postmortem drafts, and runbook references in Notion.

Built for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04).

---

## How It Works

1. An engineer mentions the bot in Slack with a command (e.g. `@bot create-incident sev2 payments-api 500 errors spiking`)
2. The Slack app parses the command and hands it to a Claude agent equipped with Notion MCP tools
3. The agent autonomously searches the Notion workspace — looking up service details, runbooks, and past incidents — then creates or updates a structured incident page
4. A summary with a link to the Notion page is posted back to the Slack thread

### Supported Commands

| Command | Description |
|---------|-------------|
| `create-incident <sev> <service> <description>` | Creates a new incident page in Notion with summary, impact, timeline, related knowledge, and suggested next steps |
| `update-incident <details>` | Appends a timestamped update to the incident timeline and infers status changes from natural language |
| `close-incident` | Marks the incident as closed, drafts a postmortem based on the timeline, and flags incomplete runbooks |

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Slack app](https://api.slack.com/apps) configured with the included `manifest.json` and a Slack webhook enabled and connected to the alerting service of your choice.
- An [Anthropic API key](https://console.anthropic.com/)
- A Notion workspace with the expected databases (Services, Incidents, Action Items). [Template](https://pewter-clutch-c09.notion.site/Relay-An-Incident-Management-Assistant-331e03a0298080edbaeddc113e183bad?pvs=74)

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

```sh
cp .env.sample .env
```

Fill in the values in `.env`:

| Variable | Description |
|----------|-------------|
| `SLACK_APP_TOKEN` | Slack app-level token (with `connections:write` scope) |
| `SLACK_BOT_TOKEN` | Bot user OAuth token |
| `SLACK_CLIENT_ID` | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Slack app client secret |
| `SLACK_SIGNING_SECRET` | Slack signing secret |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NOTION_API_KEY` | Notion integration API key |
| `MCP_SERVER_URL` | Notion MCP server URL (default: `https://mcp.notion.com/mcp`) |
| `CALLBACK_PORT` | Local OAuth callback port (default: `9876`) |

### 3. Start the app

```sh
npm start
```

On first launch, the Notion MCP client will initiate an OAuth flow. **Click the authorization link printed in the console** — it will open a browser window to authenticate with Notion. After granting access, you'll be redirected to `localhost:9876/callback` and the app will be ready.

## Project Structure

```
.
├── app.ts                    # Entry point — Slack Bolt server + Notion MCP client init
├── manifest.json             # Slack app manifest
│
├── agent/                    # Claude agent with MCP tool integration
│   ├── index.ts              #   Agentic loop using Anthropic SDK + MCP tools
│   └── prompts.ts            #   System prompts for create/update/close commands
│
├── listeners/                # Slack event handlers
│   ├── events/
│   │   └── notion-mentions.ts  # Core command parser and agent dispatcher
│   └── messages/
│       └── sample-message.ts
│
├── notion-mcp-client/        # Notion MCP client (OAuth 2.0 PKCE, SSE transport)
│   └── index.ts
│
├── notion-rest-client/       # Notion REST API wrapper (fallback/utility)
│   └── index.ts
│
├── config/                   # Notion workspace IDs and resource references
│   └── notion-config.ts
│
├── lgtm/                     # Grafana/Loki/Prometheus config for local observability
│
└── tests/                    # Test suite
```

---

## Tech Stack

- **Slack Bolt** — Real-time Slack event handling via socket mode
- **Anthropic SDK** — Claude agent with tool use (agentic loop)
- **Model Context Protocol (MCP)** — Notion MCP server for structured workspace operations
- **Notion API** — REST client as a supplementary integration
- **TypeScript + tsx** — Runtime and type safety
