// Uses the Anthropic SDK's built-in BetaToolRunner and MCP helpers
// to replace the manual agentic loop.
//
// Credit: https://github.com/anthropics/anthropic-sdk-typescript 

import Anthropic from "@anthropic-ai/sdk";
import { mcpTools, type MCPClientLike } from "@anthropic-ai/sdk/helpers/beta/mcp";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { BetaTextBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.js";

const anthropic = new Anthropic();

/**
 * Run Claude as an agent with access to Notion MCP tools.
 *
 * Uses the SDK's built-in toolRunner to handle the agentic loop:
 *   - Converts MCP tools to runnable Anthropic tools automatically
 *   - Dispatches tool calls to the MCP client
 *   - Feeds results back to Claude
 *   - Repeats until Claude returns a final text response
 *
 * Returns Claude's final text response.
 */
export async function runAgent(
  systemPrompt: string,
  userMessage: string,
  mcpClient: Client,
): Promise<string> {
  const { tools } = await mcpClient.listTools();
  // Cast needed: MCP SDK v1.27+ callTool() return type has a union branch
  // where `content` is absent (toolResult-only responses), but Notion MCP
  // always returns content blocks. The Anthropic SDK's MCPClientLike
  // interface requires `content` to always be present.
  const runnableTools = mcpTools(tools, mcpClient as unknown as MCPClientLike);

  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools: runnableTools,
    messages: [{ role: "user", content: userMessage }],
    max_iterations: 15,
  });

  const finalMessage = await runner.runUntilDone();

  return finalMessage.content
    .filter((b): b is BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}