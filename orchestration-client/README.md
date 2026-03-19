A service that receives and processes Slack events, authenticates to Notion MCP

Core Features:
1. Listens for alert pages once an Engineer responds to alert with "/create-incident sev component alert" command (human in the loop): 
   - Creates an incident summary poge in Notion, generating a summary, impact, timeline, related knowledge, and next steps
   - Sends a message to the Slack channel with the incident summary and a link to the incident page in Notion.
2. Update incident page with new information when Engineer responds to alert with "/update-incident body" command.
3. Add comments to incident page for postmortem when Engineer responds to alert with "/add-comment body" command.
4. Close incident when Engineer responds to alert with "/close-incident" command.
   - Drafts a postmortem summary and adds it to the incident page in Notion.
   - Writes a follow-up task in Notion for the responsible team to address any action items identified in the postmortem.
   - Writes incident to Notion database??

The only definitive commands should be the open and close. The rest should be free flowing chat prompts that the bot
can send to Notion MCP.

Might have to pivot from '/' commands

Reach Features:
* Command to manage follow up tasks for an incident