import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChatEvent, ChatSession, SessionSummary } from '@rezoning-ai/chat';
import { afterAll, beforeAll, describe, test, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { ChatStore } from '../src/chat-store.js';

interface UpstreamRequest {
  model: string;
  stream: boolean;
  enable_thinking: boolean;
  messages: { role: string; content: string | null; tool_call_id?: string }[];
  tools?: { function: { name: string } }[];
}

// The restart scenario checks the chat history written by earlier scenarios.
describe('chat session API and recovery', { concurrent: false, shuffle: false }, () => {
  let directory: string | undefined;
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  let first: SessionSummary;
  let second: SessionSummary;
  const timeTurnId = randomUUID();
  const requests: UpstreamRequest[] = [];
  let interruptNext = true;
  const upstream = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw) as UpstreamRequest;
    requests.push(request);
    const message = request.messages.at(-1)!;
    res.setHeader('Content-Type', 'text/event-stream');
    const write = (delta: object, reason: string | null = null) => {
      const part = {
        id: 'mock-completion',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'qwen-plus',
        choices: [{ index: 0, delta, finish_reason: reason }],
      };
      res.write(`data: ${JSON.stringify(part)}\n\n`);
    };
    if (message.role === 'tool') {
      const time = JSON.parse(message.content!) as { display: string };
      write({ content: `当前北京时间 ${time.display}。` });
    } else if (message.content === '现在几点？') {
      write({
        role: 'assistant',
        tool_calls: [
          {
            index: 0,
            id: 'time-call',
            type: 'function',
            function: { name: 'get_current_time', arguments: '{' },
          },
        ],
      });
      write({ tool_calls: [{ index: 0, function: { arguments: '}' } }] });
      write({}, 'tool_calls');
      res.end('data: [DONE]\n\n');
      return;
    } else if (message.content === '测试回复中断' && interruptNext) {
      interruptNext = false;
      write({ content: '这是一段未完成的回复。' });
      return;
    } else if (message.content === '关闭时仍在生成') {
      write({ content: '准备停止服务。' });
      return;
    } else {
      write({ content: '模型' });
      write({ content: '回复。' });
    }
    write({}, 'stop');
    res.end('data: [DONE]\n\n');
  });

  const listen = () =>
    new Promise<number>((resolve, reject) => {
      upstream.once('error', reject);
      upstream.listen(0, '127.0.0.1', () => {
        const address = upstream.address();
        assert.ok(address && typeof address !== 'string');
        resolve(address.port);
      });
    });
  async function start() {
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    app.get(ChatStore).recoverInterruptedTurns();
  }

  async function stop() {
    await app?.close();
    app = undefined;
  }

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'rezoning-test-'));
    const port = await listen();
    vi.stubEnv('DASHSCOPE_API_KEY', 'test-key');
    vi.stubEnv('DASHSCOPE_BASE_URL', `http://127.0.0.1:${port}/compatible-mode/v1`);
    vi.stubEnv('DASHSCOPE_MODEL', 'qwen-plus');
    vi.stubEnv('DATABASE_PATH', join(directory, 'chat.sqlite'));
    await start();
    first = await create();
    second = await create();
  });

  afterAll(async () => {
    try {
      await stop();
    } finally {
      upstream.closeAllConnections();
      await new Promise<void>((resolve) => upstream.close(() => resolve()));
      vi.unstubAllEnvs();
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  });

  async function call(path: string, options?: RequestInit) {
    assert.ok(app);
    return fetch(`${await app.getUrl()}/api${path}`, options);
  }
  async function create(): Promise<SessionSummary> {
    const res = await call('/sessions', { method: 'POST' });
    assert.equal(res.status, 201);
    return res.json() as Promise<SessionSummary>;
  }
  async function send(id: string, input: string, signal?: AbortSignal, turnId = randomUUID()) {
    return call(`/sessions/${id}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, turnId }),
      signal,
    });
  }
  async function readEvents(res: Response): Promise<ChatEvent[]> {
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type')!, /^text\/event-stream/);
    return (await res.text())
      .trim()
      .split('\n\n')
      .map((line) => JSON.parse(line.slice(6)) as ChatEvent);
  }
  async function get(id: string): Promise<ChatSession> {
    const res = await call(`/sessions/${id}`);
    assert.equal(res.status, 200);
    return res.json() as Promise<ChatSession>;
  }

  test('two real stream fragments and restored model context', async () => {
    const turnId = randomUUID();
    const events = await readEvents(await send(first.id, '准备研究陆上风电。', undefined, turnId));
    assert.deepEqual(
      events.filter((event) => event.type === 'text').map((event) => event.delta),
      ['模型', '回复。'],
    );
    assert.equal(events.at(-1)?.type, 'finish');
    const requestCount = requests.length;
    const replay = await readEvents(await send(first.id, '准备研究陆上风电。', undefined, turnId));
    assert.deepEqual(replay.at(-1), events.at(-1));
    assert.equal(requests.length, requestCount);
    assert.equal((await get(first.id)).turns.length, 1);
    await readEvents(await send(first.id, '刚才是什么项目类型？'));
    const last = requests.at(-1)!;
    assert.ok(last.messages.some((message) => message.content === '准备研究陆上风电。'));
    await readEvents(await send(second.id, '准备研究地面光伏。'));
    assert.ok(
      !requests.at(-1)!.messages.some((message) => message.content === '准备研究陆上风电。'),
    );
  });

  test('tool call fragments are assembled, executed, and sent back to Qwen', async () => {
    const before = Date.now();
    const events = await readEvents(await send(first.id, '现在几点？', undefined, timeTurnId));
    const toolEvents = events.filter((event) => event.type === 'tool');
    assert.deepEqual(
      toolEvents.map((event) => event.tool.status),
      ['running', 'succeeded'],
    );
    assert.equal(toolEvents[1].tool.name, '读取当前时间');
    const upstreamCall = requests.at(-2)!;
    assert.equal(upstreamCall.model, 'qwen-plus');
    assert.equal(upstreamCall.enable_thinking, false);
    assert.equal(upstreamCall.stream, true);
    assert.equal(upstreamCall.tools?.[0]?.function.name, 'get_current_time');
    const toolResult = requests.at(-1)!.messages.at(-1)!;
    assert.equal(toolResult.role, 'tool');
    assert.equal(toolResult.tool_call_id, 'time-call');
    const result = JSON.parse(toolResult.content!) as {
      iso: string;
      timeZone: string;
      display: string;
    };
    assert.equal(result.timeZone, 'Asia/Shanghai');
    assert.ok(Date.parse(result.iso) >= before && Date.parse(result.iso) <= Date.now());
    const completed = events.at(-1);
    assert.ok(completed?.type === 'finish' && completed.turn.reply.includes(result.display));
  });

  test('browser disconnect records interruption and retry keeps the same user message', async () => {
    const controller = new AbortController();
    const response = await send(first.id, '测试回复中断', controller.signal);
    const reader = response.body!.getReader();
    let partial = '';
    const decoder = new TextDecoder();
    while (!partial.includes('未完成的回复')) {
      const next = await reader.read();
      assert.ok(!next.done);
      partial += decoder.decode(next.value, { stream: true });
    }
    const busy = await send(first.id, '同时发送');
    assert.equal(busy.status, 409);
    controller.abort();
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();

    let last = (await get(first.id)).turns.at(-1)!;
    for (let attempts = 0; last.status === 'running' && attempts < 40; attempts++) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      last = (await get(first.id)).turns.at(-1)!;
    }
    assert.equal(last.status, 'interrupted');
    assert.equal(last.input, '测试回复中断');
    const events = await readEvents(
      await call(`/sessions/${first.id}/turns/${last.id}/retry`, {
        method: 'POST',
      }),
    );
    const completed = events.at(-1);
    assert.ok(completed?.type === 'finish' && completed.turn.status === 'completed');
    assert.equal(completed.turn.id, last.id);
    assert.equal((await get(first.id)).turns.filter((item) => item.input === last.input).length, 1);
  });

  test('SQLite retains both sessions and recovers an unfinished turn after restart', async () => {
    assert.ok(app);
    const running = app.get(ChatStore).begin(second.id, '重启前的消息');
    const shutdownResponse = await send(first.id, '关闭时仍在生成');
    const [shutdownEvents] = await Promise.all([readEvents(shutdownResponse), stop()]);
    const interrupted = shutdownEvents.at(-1);
    assert.ok(interrupted?.type === 'finish' && interrupted.turn.status === 'interrupted');
    await start();
    const firstSession = await get(first.id);
    const secondSession = await get(second.id);
    const timeTurn = firstSession.turns.find((turn) => turn.id === timeTurnId);
    assert.equal(timeTurn?.tools.find((tool) => tool.id === 'time-call')?.status, 'succeeded');
    assert.equal(firstSession.turns.at(-1)?.status, 'interrupted');
    assert.equal(secondSession.turns[0].input, '准备研究地面光伏。');
    assert.equal(secondSession.turns.at(-1)?.id, running.turn.id);
    assert.equal(secondSession.turns.at(-1)?.status, 'interrupted');
    await readEvents(await send(first.id, '继续交流'));
    assert.ok(
      requests
        .at(-1)!
        .messages.some((item) => item.role === 'tool' && item.tool_call_id === 'time-call'),
    );
  });
});
