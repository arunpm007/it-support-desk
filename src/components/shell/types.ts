export type ShellPerson = { key: string; name: string; role: string };

export type ShellData = {
  viewer: ShellPerson & { isStaff: boolean };
  people: ShellPerson[];
  devices: { id: string; model: string; owner: string }[];
  tickets: { id: string; title: string; status: string }[];
  openTickets: number;
  chats: { id: string; title: string; updatedAt: string }[];
};
