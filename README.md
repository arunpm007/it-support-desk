# Northwind IT Desk: an AI helpdesk agent

A small office (50–100 people) can't justify an expensive IT service-management tool, but it still needs to:

- keep track of every computer and its repair history,
- help non-technical staff of any age fix common problems themselves,
- and raise a proper ticket when something needs a technician.

This app does that with an **AI agent**. People describe a problem in their own words ("my laptop is slow again"). The agent looks up their computer, reads its repair history, finds a matching self-help guide, and raises a ticket when the problem keeps coming back or the hardware looks faulty.

## What it does

| Screen | Who | What |
|---|---|---|
| **Get help** | Employees, IT staff | Chat with the agent. Under each answer, chips show exactly what the agent did ("Checked LAP-101 and its repair history", "Raised ticket TCK-1004"). |
| **Devices** | IT staff | Every computer: model, owner, age, repair count, open tickets. Old or often-repaired machines are highlighted. |
| **Device detail** | IT staff | Specs, full repair history and tickets for one machine. |
| **Tickets** | IT staff | All tickets, with filters, notes and status changes. Tickets raised by the agent are marked. |

## How the agent works

```
User message
   │
   ▼
┌──────────────────────────────┐      tool_use       ┌─────────────────────────┐
│ Claude (model) + tool list   │ ──────────────────▶ │ Our code runs the tool  │
│ decides what to do next      │ ◀────────────────── │ (with permission checks)│
└──────────────────────────────┘     tool_result     └─────────────────────────┘
   │  repeats until it has enough information
   ▼
Plain-language answer + list of actions taken
```

- **The loop** ([src/lib/agent.ts](src/lib/agent.ts)) sends the conversation and the tool list to the model. If the model asks for tools, the app runs them (in parallel when there are several), sends the results back, and repeats. It stops when the model answers in text, or after 8 rounds as a safety limit.
- **Tools** ([src/lib/tools.ts](src/lib/tools.ts)):

  | Tool | Employee | IT staff |
  |---|---|---|
  | `get_my_devices`: who am I, which computers are mine | ✅ | |
  | `find_employee`: search people | | ✅ |
  | `get_device_details`: specs + repair history + tickets | own devices only | ✅ |
  | `search_known_fixes`: self-help knowledge base | ✅ | ✅ |
  | `create_ticket`: raise a ticket | for themselves only | ✅ |
  | `list_tickets`: ticket status | own tickets only | ✅ |
  | `update_ticket`: change status, add a note | | ✅ |
  | `get_fleet_report`: which machines to replace | | ✅ |

## Security decisions

- **Permissions are enforced in code, not in the prompt.** Employees are never offered staff-only tools, and every tool checks again before it runs. Even if someone talks the model into trying, `get_device_details("DSK-201")` from another employee returns "This device is not assigned to you."
- **Model output is untrusted input.** Every tool call is validated with Zod before it runs, on top of `strict: true` tool schemas.
- **Conversations are stored on the server.** The browser only holds an ID, so it can't rewrite what the model or the tools said earlier.
- **Errors never crash the loop.** A failed tool returns `is_error: true` with a short message, so the model can explain or try something else.
- **Refusals are handled.** The API is asked to retry on its recommended fallback model if a safety check declines a request (`fallbacks: "default"`).

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Anthropic TypeScript SDK (Claude, tool use) · Zod · a JSON-file store (easy to swap for PostgreSQL).

## Run it locally

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a Claude API key at [platform.claude.com](https://platform.claude.com) → **API keys**, and add a little credit (a few dollars is plenty for a demo).
3. Copy the example env file and paste your key into `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Start the app and open http://localhost:3000:
   ```bash
   pnpm dev
   ```

Demo data is created on first run in `data/db.json`. Use **Reset demo data** at the bottom of the Tickets page to start again.

### Things to try

- As **Priya Sharma**: "My laptop is very slow again". Her laptop has been repaired for slowness three times, so the agent should notice the pattern and raise a ticket instead of only repeating tips.
- As **Priya**: "Show me the repair history of DSK-201". That isn't her computer, so access is refused.
- As **IT staff**: "Which computers should we replace first?"
- As **IT staff**: "Mark TCK-1002 as in progress, driver reinstall scheduled for Friday".

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Required. |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model ID. `claude-haiku-5-5` is much cheaper and fine for simple helpdesk chat. |
| `CLAUDE_EFFORT` | `low` | `low`, `medium` or `high`. Higher means more careful reasoning but slower and costlier. |

## Ideas for next steps

- Stream answers token by token.
- Swap the JSON store for PostgreSQL.
- Real sign-in instead of the "You are" picker.
- Agent-written weekly report for the IT manager.
- Email or Slack alerts when an urgent ticket is raised.
