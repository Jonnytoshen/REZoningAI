import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { ModelMessage } from 'ai';
import type { ChatSession, SessionSummary, ToolRun, Turn } from '../../../shared/chat.js';

interface TurnRow extends Omit<Turn, 'tools' | 'error'> {
  tools: string;
  error: string | null;
}

export interface TurnReceipt {
  turn: Turn;
  session: SessionSummary;
  replay?: boolean;
}

function fromRow({ tools, error, ...turn }: TurnRow): Turn {
  return { ...turn, tools: JSON.parse(tools) as ToolRun[], error: error ?? undefined };
}

export class ChatStore implements OnApplicationShutdown {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        input TEXT NOT NULL,
        reply TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'interrupted', 'failed')),
        tools TEXT NOT NULL DEFAULT '[]',
        error TEXT,
        model_messages TEXT
      );

      CREATE INDEX IF NOT EXISTS turns_by_session ON turns(session_id);
      CREATE UNIQUE INDEX IF NOT EXISTS one_running_turn
        ON turns(session_id) WHERE status = 'running';
    `);
  }

  onApplicationShutdown(): void {
    this.db.close();
  }

  recoverInterruptedTurns(): void {
    this.db.prepare(`
      UPDATE turns SET status = 'interrupted', error = ?
      WHERE status = 'running'
    `).run('应用已重启，可以重试这条消息。');
  }

  listSessions(): SessionSummary[] {
    return this.db.prepare(`
      SELECT id, title, updated_at AS updatedAt
      FROM sessions ORDER BY updated_at DESC, rowid DESC
    `).all() as unknown as SessionSummary[];
  }

  createSession(): SessionSummary {
    const session = { id: randomUUID(), title: '新会话', updatedAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
      session.id, session.title, session.updatedAt,
    );
    return session;
  }

  getSession(id: string): ChatSession {
    const session = this.sessionSummary(id);
    const rows = this.db.prepare(`
      SELECT id, input, reply, created_at AS createdAt, status, tools, error
      FROM turns WHERE session_id = ? ORDER BY rowid
    `).all(id) as unknown as TurnRow[];
    return { ...session, turns: rows.map(fromRow) };
  }

  begin(sessionId: string, input: string, id: string = randomUUID()): TurnReceipt {
    return this.transaction(() => {
      const session = this.sessionSummary(sessionId);
      const existing = this.db.prepare(`
        SELECT id, input, reply, created_at AS createdAt, status, tools, error
        FROM turns WHERE id = ? AND session_id = ?
      `).get(id, sessionId) as unknown as TurnRow | undefined;
      if (existing) {
        if (existing.input !== input) throw new ConflictException('这条消息的内容已经保存。');
        return { turn: fromRow(existing), session, replay: true };
      }
      if (this.db.prepare('SELECT 1 FROM turns WHERE id = ?').get(id)) {
        throw new ConflictException('这条消息已保存在另一个会话。');
      }
      this.ensureIdle(sessionId);
      const createdAt = new Date().toISOString();
      const turn: Turn = {
        id, input, createdAt, reply: '', tools: [], status: 'running',
      };
      const first = !this.db.prepare('SELECT 1 FROM turns WHERE session_id = ? LIMIT 1').get(sessionId);
      if (first) {
        const text = Array.from(input.replace(/\s+/g, ' '));
        session.title = text.slice(0, 28).join('') + (text.length > 28 ? '…' : '');
      }
      session.updatedAt = createdAt;
      this.db.prepare(`
        INSERT INTO turns (id, session_id, input, created_at, status) VALUES (?, ?, ?, ?, 'running')
      `).run(turn.id, sessionId, input, createdAt);
      this.saveSummary(session);
      return { turn, session };
    });
  }

  retry(sessionId: string, id: string): TurnReceipt {
    return this.transaction(() => {
      const session = this.sessionSummary(sessionId);
      this.ensureIdle(sessionId);
      const last = this.db.prepare(`
        SELECT id, input, created_at AS createdAt, status FROM turns
        WHERE session_id = ? ORDER BY rowid DESC LIMIT 1
      `).get(sessionId) as Pick<Turn, 'id' | 'input' | 'createdAt' | 'status'> | undefined;
      if (!last || last.id !== id || !['failed', 'interrupted'].includes(last.status)) {
        throw new ConflictException('只能重试此会话中最后一条失败或中断的消息。');
      }
      const turn: Turn = { ...last, status: 'running', reply: '', tools: [] };
      this.db.prepare(`
        UPDATE turns SET reply = '', tools = '[]', status = 'running', error = NULL
        WHERE id = ?
      `).run(id);
      session.updatedAt = new Date().toISOString();
      this.saveSummary(session);
      return { turn, session };
    });
  }

  modelHistory(sessionId: string, currentId: string): ModelMessage[] {
    const rows = this.db.prepare(`
      SELECT input, model_messages AS modelMessages FROM turns
      WHERE session_id = ? AND id <> ? ORDER BY rowid
    `).all(sessionId, currentId) as { input: string; modelMessages: string | null }[];
    return rows.flatMap(({ input, modelMessages }): ModelMessage[] => [
      { role: 'user', content: input },
      ...(modelMessages ? JSON.parse(modelMessages) as ModelMessage[] : []),
    ]);
  }

  finish(turn: Turn, messages?: ModelMessage[]): void {
    this.db.prepare(`
      UPDATE turns SET reply = ?, status = ?, tools = ?, error = ?, model_messages = ?
      WHERE id = ? AND status = 'running'
    `).run(turn.reply, turn.status, JSON.stringify(turn.tools), turn.error ?? null,
      messages ? JSON.stringify(messages) : null, turn.id);
  }

  private sessionSummary(id: string): SessionSummary {
    const session = this.db.prepare(`
      SELECT id, title, updated_at AS updatedAt FROM sessions WHERE id = ?
    `).get(id) as SessionSummary | undefined;
    if (!session) throw new NotFoundException('找不到此会话。');
    return session;
  }

  private saveSummary(session: SessionSummary): void {
    this.db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?')
      .run(session.title, session.updatedAt, session.id);
  }

  private ensureIdle(sessionId: string): void {
    if (this.db.prepare(`
      SELECT 1 FROM turns WHERE session_id = ? AND status = 'running' LIMIT 1
    `).get(sessionId)) {
      throw new ConflictException('此会话正在生成回复，请稍后再试。');
    }
  }

  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = work();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
