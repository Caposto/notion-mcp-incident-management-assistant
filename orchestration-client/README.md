A service that receives and processes Slack events, authenticates to Notion MCP

Core Features:
1. Listens for alert pages and creates an incident page once Engineer responds to alert with "/create-incident sev component alert" command. Immediately pulls related info and links and sends it back to Slack
2. Update incident page with new information when Engineer responds to alert with "/update-incident body" command.
3. Add comments to incident page for postmortem when Engineer responds to alert with "/add-comment body" command.
4. Close incident when Engineer responds to alert with "/close-incident" command.

Might have to pivot from '/' commands

Reach Features:
* Command to manage follow up tasks for an incident