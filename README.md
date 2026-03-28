# Notion MCP Challenge - Incident Management Assistant

### Setup

1. Create a `.env` file in the `payments-api` directory by filling in the values from `.env.local`.
  
## docker-otel-lgtm 

For local development and testing spin up the [docker-otel-lgtm](https://github.com/grafana/docker-otel-lgtm/tree/main?tab=readme-ov-file). 

```bash
docker run --name lgtm -p 3000:3000 -p 4317:4317 -p 4318:4318 --rm -ti \
	-v "$PWD"/lgtm/grafana:/data/grafana \
	-v "$PWD"/lgtm/prometheus:/data/prometheus \
	-v "$PWD"/lgtm/loki:/data/loki \
	-e GF_PATHS_DATA=/data/grafana \
	docker.io/grafana/otel-lgtm:0.8.1
```

Access the Grafana dashboard at [localhost:3000](http://localhost:3000)

Then, in another terminal, start the Deno API:

```bash
cd payments-api
deno run dev
```

Follow the README in the `notion-orchestration-app` directory to set up the Slack app and start the Bolt server.

# TODOS
- Prevent multiple notion mcp sessions for the same incident
- Update app scope to allow app_mention events