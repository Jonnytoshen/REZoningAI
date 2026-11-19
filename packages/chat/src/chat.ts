export interface ModelConfig {
  model: string;
  configured: boolean;
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ToolRun {
  id: string;
  name: string;
  status: 'running' | 'succeeded' | 'failed';
  detail?: string;
}

export interface Turn {
  id: string;
  input: string;
  reply: string;
  createdAt: string;
  status: 'running' | 'completed' | 'interrupted' | 'failed';
  tools: ToolRun[];
  error?: string;
}

export interface ChatSession extends SessionSummary {
  turns: Turn[];
}

export type ChatEvent =
  | { type: 'start'; turn: Turn; session: SessionSummary }
  | { type: 'text'; delta: string }
  | { type: 'tool'; tool: ToolRun }
  | { type: 'finish'; turn: Turn };

export const MAX_MESSAGE_LENGTH = 8_000;

export function updateToolRun(tools: ToolRun[], event: ToolRun): ToolRun[] {
  const existing = tools.some((tool) => tool.id === event.id);
  return existing ? tools.map((tool) => (tool.id === event.id ? event : tool)) : [...tools, event];
}
