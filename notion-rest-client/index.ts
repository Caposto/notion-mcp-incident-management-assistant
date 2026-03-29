import { Client } from "@notionhq/client";
import { NOTION_IDS } from "../config/notion-config.ts";
import process from "node:process";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * Query the Incidents data source for a page whose "Slack Thread ID" property
 * matches the given thread timestamp.
 *
 * Returns the Notion page URL if found, null otherwise.
 *
 * NOTE: The filter assumes a rich_text property named "Slack Thread ID"
 */
export async function findIncidentByThread(
  threadTs: string,
): Promise<string | null> {
  const response = await notion.dataSources.query({
    data_source_id: NOTION_IDS.INCIDENTS_DS,
    filter: {
      property: "Slack Thread ID",
      rich_text: { equals: threadTs },
    },
    page_size: 1,
  });

  if (response.results.length > 0) {
    const page = response.results[0];
    if ("url" in page) {
      return page.url;
    }
  }

  return null;
}
