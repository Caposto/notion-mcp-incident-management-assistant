# Coffee Grinds Service

This is a fictional service used to help demonstrate the capabilities of the
Notion MCP Indient Management Assistant. It is a simple API that is "multi-region"
and setup to trigger a 5XX alert.

Run the service: `docker compose up --build`

Credit https://oneuptime.com/blog/post/2026-02-06-complete-observability-stack-opentelemetry-open-source/view for 
setting up the local observability stack (otel collector, grafana, prometheus)

  ┌───────────┬────────────────┐
  │  Service  │   Host Port    │
  ├───────────┼────────────────┤
  │ us-east-1 │ localhost:3003 │
  ├───────────┼────────────────┤
  │ us-west-2 │ localhost:3004 │
  ├───────────┼────────────────┤
  │ Grafana   │ localhost:3000 │
  ├───────────┼────────────────┤
  │ Prometheus│ localhost:9090 │
  └───────────┴────────────────┘
