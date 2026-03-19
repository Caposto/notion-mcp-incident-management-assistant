import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export async function createMcpClient(
  serverUrl: string,
  accessToken: string,
  useSSE: boolean = false,
): Promise<Client> {
  const client = new Client(
    {
      name: "your-mcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        roots: {},
        sampling: {},
      },
    },
  );

  let transport;

  if (useSSE) {
    transport = new SSEClientTransport(new URL(`${serverUrl}/sse`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "YourApp-MCP-Client/1.0",
        },
      },
    });
  } else {
    transport = new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "YourApp-MCP-Client/1.0",
        },
      },
    });
  }

  await client.connect(transport);

  return client;
}

// Usage with automatic fallback
export async function connectToNotionMcp(accessToken: string): Promise<Client> {
  const serverUrl = "https://mcp.notion.com";

  try {
    return await createMcpClient(serverUrl, accessToken, false);
  } catch (error) {
    console.warn("Streamable HTTP failed, falling back to SSE:", error);
    return await createMcpClient(serverUrl, accessToken, true);
  }
}
