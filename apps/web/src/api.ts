import type { ChatEvent, ChatSession, ModelConfig, SessionSummary } from '@rezoning-ai/chat';

async function check(response: Response): Promise<void> {
  if (response.ok) return;
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(body?.message || '暂时无法连接应用，请稍后重试。');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  await check(response);
  return response.json() as Promise<T>;
}

export const getConfig = () => request<ModelConfig>('/config');
export const listSessions = () => request<SessionSummary[]>('/sessions');
export const createSession = (signal: AbortSignal) => request<SessionSummary>('/sessions', {
  method: 'POST', signal,
});
export const getSession = (id: string, signal?: AbortSignal) => request<ChatSession>(
  `/sessions/${encodeURIComponent(id)}`, { signal },
);

export async function streamTurn(
  sessionId: string,
  action: { input: string; turnId: string } | { retryId: string },
  signal: AbortSignal,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const base = `/api/sessions/${encodeURIComponent(sessionId)}/turns`;
  const retry = 'retryId' in action;
  const response = await fetch(retry ? `${base}/${encodeURIComponent(action.retryId)}/retry` : base, {
    method: 'POST',
    headers: retry ? undefined : { 'Content-Type': 'application/json' },
    body: retry ? undefined : JSON.stringify(action),
    signal,
  });
  await check(response);
  if (!response.body) throw new Error('无法读取回复，请重试。');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finished = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (frame.startsWith('data: ')) {
          const event = JSON.parse(frame.slice(6)) as ChatEvent;
          onEvent(event);
          if (event.type === 'finish') finished = true;
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (!finished) throw new Error('连接中断，可重试上次发送的消息。');
}
