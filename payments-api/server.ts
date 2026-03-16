export default {
  async fetch(_req) {
    return new Response("Hello world!");
  },
} satisfies Deno.ServeDefaultExport;