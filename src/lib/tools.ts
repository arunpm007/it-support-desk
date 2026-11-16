import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { deviceAgeYears, readDb, updateDb } from "./db";
import { deviceHealth } from "./health";
import type { Actor, ChatCard, ChatStep, Db, Ticket } from "./types";

/**
 * Tools are the agent's hands: plain functions the model can ask us to run.
 * The model only sees the name, description and input schema.
 * Every permission check happens here in code, never in the prompt.
 */

export type ToolStep = ChatStep;
type ToolOutput = { result: unknown; label: string; card?: ChatCard };

/** Shown while a tool is running, before we know its result. */
export const PENDING_LABEL: Record<string, string> = {
  get_my_devices: "Looking up your devices",
  find_employee: "Searching people",
  get_device_details: "Reading the repair history",
  search_known_fixes: "Searching the fix guides",
  create_ticket: "Raising a ticket",
  list_tickets: "Checking tickets",
  update_ticket: "Updating the ticket",
  get_fleet_report: "Analysing every device",
};
type ToolDef = {
  schema: BetaTool;
  input: z.ZodType;
  staffOnly?: boolean;
  run: (input: never, actor: Actor) => Promise<ToolOutput>;
};

class ToolError extends Error {}

const STATUS = ["open", "in-progress", "resolved"] as const;
const PRIORITY = ["low", "medium", "high", "urgent"] as const;

function ownsDevice(db: Db, actor: Actor, deviceId: string) {
  if (actor.kind === "staff") return true;
  return db.devices.some((d) => d.id === deviceId && d.assignedTo === actor.employeeId);
}

function nextTicketId(db: Db) {
  const max = db.tickets.reduce((m, t) => Math.max(m, Number(t.id.split("-")[1]) || 0), 1000);
  return `TCK-${max + 1}`;
}

function pickTicket(t: Ticket) {
  return { id: t.id, title: t.title, status: t.status, priority: t.priority, category: t.category, deviceId: t.deviceId };
}

function scoreFix(text: string, keywords: string[]) {
  const q = text.toLowerCase();
  return keywords.reduce((s, k) => (q.includes(k) ? s + k.length : s), 0);
}

const defs: Record<string, ToolDef> = {
  get_my_devices: {
    schema: {
      name: "get_my_devices",
      description:
        "Get the profile of the person you are talking to and the computers assigned to them. Call this first when they describe a problem without naming a device.",
      input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
    input: z.object({}),
    async run(_input: Record<string, never>, actor) {
      if (actor.kind === "staff") {
        return { result: { note: "You are IT staff. Use find_employee to look someone up." }, label: "Checked profile" };
      }
      const db = await readDb();
      const me = db.employees.find((e) => e.id === actor.employeeId);
      if (!me) throw new ToolError("Unknown employee");
      const devices = db.devices
        .filter((d) => d.assignedTo === me.id)
        .map((d) => ({ ...d, ageYears: deviceAgeYears(d.purchased) }));
      return {
        result: { employee: me, devices },
        label: `Looked up ${me.name.split(" ")[0]}'s devices`,
        card: {
          kind: "devices",
          devices: db.devices
            .filter((d) => d.assignedTo === me.id)
            .map((d) => {
              const h = deviceHealth(d, db.repairs);
              return { id: d.id, model: d.model, type: d.type, score: h.score, label: h.label };
            }),
        },
      };
    },
  },

  find_employee: {
    staffOnly: true,
    schema: {
      name: "find_employee",
      description: "Search employees by name, email, department or ID. Returns matches with their assigned devices.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string", description: "Name, email, department or employee ID" } },
        required: ["query"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({ query: z.string().min(1) }),
    async run(input: { query: string }) {
      const db = await readDb();
      const q = input.query.toLowerCase();
      const matches = db.employees
        .filter((e) => [e.id, e.name, e.email, e.department].some((v) => v.toLowerCase().includes(q)))
        .slice(0, 10)
        .map((e) => ({ ...e, devices: db.devices.filter((d) => d.assignedTo === e.id).map((d) => d.id) }));
      return { result: { matches }, label: `Searched employees for “${input.query}”` };
    },
  },

  get_device_details: {
    schema: {
      name: "get_device_details",
      description:
        "Get one computer's details (model, age, RAM, storage, status), its full repair history and its tickets. Use it to spot repeat problems.",
      input_schema: {
        type: "object",
        properties: { device_id: { type: "string", description: "Asset tag, e.g. LAP-101 or DSK-201" } },
        required: ["device_id"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({ device_id: z.string().min(1) }),
    async run(input: { device_id: string }, actor) {
      const db = await readDb();
      const id = input.device_id.toUpperCase().trim();
      const device = db.devices.find((d) => d.id === id);
      if (!device) throw new ToolError(`No device with ID ${id}`);
      if (!ownsDevice(db, actor, id)) throw new ToolError("This device is not assigned to you.");
      const repairHistory = db.repairs.filter((r) => r.deviceId === id).sort((a, b) => b.date.localeCompare(a.date));
      const health = deviceHealth(device, db.repairs);
      return {
        result: {
          device: { ...device, ageYears: deviceAgeYears(device.purchased) },
          health,
          repairHistory,
          tickets: db.tickets.filter((t) => t.deviceId === id),
        },
        label: `Checked ${id} and its repair history`,
        card: {
          kind: "device",
          device: {
            id: device.id,
            model: device.model,
            type: device.type,
            os: device.os,
            ramGB: device.ramGB,
            ageYears: deviceAgeYears(device.purchased),
            status: device.status,
            owner: db.employees.find((e) => e.id === device.assignedTo)?.name ?? "Unassigned",
          },
          health,
          repairs: repairHistory.map((r) => ({ date: r.date, issue: r.issue })),
        },
      };
    },
  },

  search_known_fixes: {
    schema: {
      name: "search_known_fixes",
      description:
        "Search the IT knowledge base for step-by-step self-help fixes for a problem description. Returns the best matching articles.",
      input_schema: {
        type: "object",
        properties: { problem: { type: "string", description: "The problem in plain words" } },
        required: ["problem"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({ problem: z.string().min(1) }),
    async run(input: { problem: string }) {
      const db = await readDb();
      const articles = db.knownFixes
        .map((k) => ({ k, score: scoreFix(input.problem, k.keywords) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((x) => x.k);
      return {
        result: articles.length ? { articles } : { articles: [], note: "No matching article. Consider raising a ticket." },
        label: articles.length ? `Found fix guide: ${articles[0].title}` : "Searched the fix guides",
        card: articles.length ? { kind: "fix", title: articles[0].title, steps: articles[0].steps } : undefined,
      };
    },
  },

  create_ticket: {
    schema: {
      name: "create_ticket",
      description:
        "Raise a support ticket for IT staff. Use when self-help did not work, hardware looks faulty, the same problem keeps coming back, or the person asks for one.",
      input_schema: {
        type: "object",
        properties: {
          device_id: { type: "string", description: "Asset tag of the affected device, or empty string if none" },
          employee_id: {
            type: "string",
            description: "Employee the ticket is for. Ignored for employees (always themselves).",
          },
          title: { type: "string", description: "Short summary, under 80 characters" },
          description: {
            type: "string",
            description: "What is wrong, what was already tried, and relevant history (e.g. repeat repairs)",
          },
          category: {
            type: "string",
            enum: ["Hardware", "Software", "Network", "Printing", "Account", "Email", "Other"],
          },
          priority: { type: "string", enum: [...PRIORITY] },
        },
        required: ["device_id", "employee_id", "title", "description", "category", "priority"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({
      device_id: z.string(),
      employee_id: z.string(),
      title: z.string().min(3).max(120),
      description: z.string().min(3),
      category: z.string(),
      priority: z.enum(PRIORITY),
    }),
    async run(
      input: {
        device_id: string;
        employee_id: string;
        title: string;
        description: string;
        category: string;
        priority: Ticket["priority"];
      },
      actor,
    ) {
      const ticket = await updateDb((db) => {
        const employeeId = actor.kind === "employee" ? actor.employeeId : input.employee_id.trim();
        if (!db.employees.some((e) => e.id === employeeId)) throw new ToolError(`No employee with ID ${employeeId}`);
        const deviceId = input.device_id.trim() ? input.device_id.toUpperCase().trim() : null;
        if (deviceId) {
          if (!db.devices.some((d) => d.id === deviceId)) throw new ToolError(`No device with ID ${deviceId}`);
          if (!ownsDevice(db, actor, deviceId)) throw new ToolError("This device is not assigned to you.");
        }
        const t: Ticket = {
          id: nextTicketId(db),
          deviceId,
          employeeId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: "open",
          createdAt: new Date().toISOString(),
          createdBy: "assistant",
          notes: [],
        };
        db.tickets.push(t);
        return t;
      });
      return {
        result: { created: ticket },
        label: `Raised ticket ${ticket.id} (${ticket.priority})`,
        card: { kind: "ticket", action: "created", ticket: pickTicket(ticket) },
      };
    },
  },

  list_tickets: {
    schema: {
      name: "list_tickets",
      description:
        "List support tickets, newest first. Employees only ever see their own. Staff can filter by status, employee or device.",
      input_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["any", ...STATUS] },
          employee_id: { type: "string", description: "Filter by employee ID, or empty string for all" },
          device_id: { type: "string", description: "Filter by device ID, or empty string for all" },
        },
        required: ["status", "employee_id", "device_id"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({ status: z.enum(["any", ...STATUS]), employee_id: z.string(), device_id: z.string() }),
    async run(input: { status: string; employee_id: string; device_id: string }, actor) {
      const db = await readDb();
      const employeeId = actor.kind === "employee" ? actor.employeeId : input.employee_id.trim();
      const tickets = db.tickets
        .filter((t) => input.status === "any" || t.status === input.status)
        .filter((t) => !employeeId || t.employeeId === employeeId)
        .filter((t) => !input.device_id.trim() || t.deviceId === input.device_id.toUpperCase().trim())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20);
      return {
        result: { tickets },
        label: `Listed ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`,
        card: tickets.length
          ? { kind: "tickets", tickets: tickets.slice(0, 6).map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })) }
          : undefined,
      };
    },
  },

  update_ticket: {
    staffOnly: true,
    schema: {
      name: "update_ticket",
      description: "Change a ticket's status and add a note explaining what was done.",
      input_schema: {
        type: "object",
        properties: {
          ticket_id: { type: "string" },
          status: { type: "string", enum: [...STATUS] },
          note: { type: "string", description: "What was done, or empty string" },
        },
        required: ["ticket_id", "status", "note"],
        additionalProperties: false,
      },
      strict: true,
    },
    input: z.object({ ticket_id: z.string(), status: z.enum(STATUS), note: z.string() }),
    async run(input: { ticket_id: string; status: Ticket["status"]; note: string }) {
      const ticket = await updateDb((db) => {
        const t = db.tickets.find((x) => x.id === input.ticket_id.toUpperCase().trim());
        if (!t) throw new ToolError(`No ticket ${input.ticket_id}`);
        t.status = input.status;
        if (input.note.trim()) t.notes.push({ at: new Date().toISOString(), by: "IT staff (via assistant)", text: input.note });
        return t;
      });
      return {
        result: { updated: ticket },
        label: `Marked ${ticket.id} as ${ticket.status}`,
        card: { kind: "ticket", action: "updated", ticket: pickTicket(ticket) },
      };
    },
  },

  get_fleet_report: {
    staffOnly: true,
    schema: {
      name: "get_fleet_report",
      description:
        "Summary of all computers for IT planning: age, specs, repair counts, open tickets. Use for questions like 'which machines should we replace?'.",
      input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
    input: z.object({}),
    async run() {
      const db = await readDb();
      const devices = db.devices
        .filter((d) => d.status !== "retired")
        .map((d) => ({
          id: d.id,
          model: d.model,
          os: d.os,
          ramGB: d.ramGB,
          ageYears: deviceAgeYears(d.purchased),
          status: d.status,
          assignedTo: db.employees.find((e) => e.id === d.assignedTo)?.name ?? "Unassigned",
          repairs: db.repairs.filter((r) => r.deviceId === d.id).length,
          openTickets: db.tickets.filter((t) => t.deviceId === d.id && t.status !== "resolved").length,
        }))
        .sort((a, b) => b.repairs - a.repairs || b.ageYears - a.ageYears);
      const worst = db.devices
        .filter((d) => d.status !== "retired")
        .map((d) => ({ d, h: deviceHealth(d, db.repairs) }))
        .sort((a, b) => a.h.score - b.h.score)
        .slice(0, 5)
        .map(({ d, h }) => ({
          id: d.id,
          model: d.model,
          owner: db.employees.find((e) => e.id === d.assignedTo)?.name ?? "Unassigned",
          score: h.score,
          label: h.label,
          reasons: h.reasons,
        }));
      return {
        result: { today: new Date().toISOString().slice(0, 10), devices },
        label: "Pulled the fleet report",
        card: { kind: "fleet", devices: worst },
      };
    },
  },
};

export function toolsFor(actor: Actor): BetaTool[] {
  return Object.values(defs)
    .filter((d) => actor.kind === "staff" || !d.staffOnly)
    .filter((d) => !(actor.kind === "staff" && d.schema.name === "get_my_devices"))
    .map((d) => d.schema);
}

/** Runs one tool call from the model. Never throws: errors go back to the model as text. */
export async function runTool(
  name: string,
  rawInput: unknown,
  actor: Actor,
): Promise<{ content: string; isError: boolean; step: ToolStep }> {
  const def = defs[name];
  if (!def || (def.staffOnly && actor.kind !== "staff")) {
    return { content: `Tool ${name} is not available.`, isError: true, step: { tool: name, label: "Blocked a tool call", ok: false } };
  }
  const parsed = def.input.safeParse(rawInput);
  if (!parsed.success) {
    return {
      content: `Invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      isError: true,
      step: { tool: name, label: "Rejected invalid input", ok: false },
    };
  }
  try {
    const out = await def.run(parsed.data as never, actor);
    return { content: JSON.stringify(out.result), isError: false, step: { tool: name, label: out.label, ok: true, card: out.card } };
  } catch (err) {
    const message = err instanceof ToolError ? err.message : "Internal error while running the tool.";
    if (!(err instanceof ToolError)) console.error(`[tool ${name}]`, err);
    return { content: message, isError: true, step: { tool: name, label: message, ok: false } };
  }
}
