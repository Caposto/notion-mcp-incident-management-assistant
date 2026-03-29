export const NOTION_IDS = {
  // Data source IDs (use these with notion-create-pages parent.data_source_id)
  SERVICES_DS: "73e2ed30-1f9e-48c5-9174-29e1267b4b9b",
  INCIDENTS_DS: "d5c3535b-514f-4bca-86e8-0ddc8f1836ca",
  ACTION_ITEMS_DS: "7d80b283-25e7-4227-83ef-2c03a9246925",

  // Page IDs (use these with notion-fetch, notion-update-page)
  RCA_TEMPLATE: "331e03a0-2980-8178-b854-c41ec21248bf",

  // Service page IDs (for the Affected Service relation)
  COFFEE_GRIND_API: "331e03a0-2980-81fa-a8b2-f6a5d883922e",
  BEAN_INVENTORY_SERVICE: "331e03a0-2980-816e-b15a-caec72cd5392",

  // Runbook page IDs # TODO: Fixme - have the notion mcp search and decide which runbooks to return
  RUNBOOK_COFFEE_GRIND: "331e03a0-2980-8118-84b6-f70ae6773c59",
  RUNBOOK_BEAN_INVENTORY: "331e03a0-2980-81e1-9a87-f074f8a2df7b",

  // Parent page
  WORKSPACE_ROOT: "331e03a0-2980-80ed-baed-dc113e183bad",
} as const;
