export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
};

export type DeviceStatus = "active" | "in-repair" | "retired";

export type Device = {
  id: string;
  type: "Laptop" | "Desktop";
  model: string;
  os: string;
  assignedTo: string | null;
  purchased: string;
  ramGB: number;
  storageGB: number;
  status: DeviceStatus;
};

export type RepairRecord = {
  id: string;
  deviceId: string;
  date: string;
  issue: string;
  fix: string;
  technician: string;
};

export type TicketStatus = "open" | "in-progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketNote = {
  at: string;
  by: string;
  text: string;
};

export type Ticket = {
  id: string;
  deviceId: string | null;
  employeeId: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  createdBy: "assistant" | "staff";
  notes: TicketNote[];
};

export type KnownFix = {
  id: string;
  title: string;
  keywords: string[];
  steps: string[];
};

export type ChatStep = { tool: string; label: string; ok: boolean };

/** What the screen shows for one message. */
export type ChatMessage =
  | { role: "user"; text: string; at: string }
  | { role: "assistant"; text: string; steps: ChatStep[]; at: string };

export type Conversation = {
  id: string;
  /** Profile that owns it ("staff" or an employee ID). Only that profile can open it. */
  viewerKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  /** Full model history (including tool calls) so the conversation can continue later. */
  history: unknown[];
};

export type Db = {
  employees: Employee[];
  devices: Device[];
  repairs: RepairRecord[];
  tickets: Ticket[];
  knownFixes: KnownFix[];
  conversations?: Conversation[];
};

/** Who is talking to the assistant. Decides which tools it gets and what data they can reach. */
export type Actor = { kind: "staff" } | { kind: "employee"; employeeId: string };
