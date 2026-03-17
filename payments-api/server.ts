import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("payments-api");
const errorCounter = meter.createCounter("payments.errors", {
  description: "Number of payment errors",
});

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/error") {
      errorCounter.add(1, { reason: "simulated" });
      return new Response("Error!", { status: 500 });
    }

    return new Response("Hello world!");
  },
} satisfies Deno.ServeDefaultExport;
