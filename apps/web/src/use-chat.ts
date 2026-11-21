import { useEffect, useRef, useState } from 'react';
import { updateToolRun } from '@rezoning-ai/chat';
import type { ChatEvent, ChatSession, ModelConfig, SessionSummary, Turn } from '@rezoning-ai/chat';
import {
  createSession,
  getConfig,
  getSession,
  listSessions,
  renameSession,
  streamTurn,
} from './api.js';
import { newDraftKey, useChatDrafts } from './use-chat-drafts.js';

function showSessionInURL(id?: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('session', id);
  else url.searchParams.delete('session');
  window.history.replaceState(null, '', url);
}

function updateTurn(session: ChatSession, updated: Turn): ChatSession {
  const exists = session.turns.some((turn) => turn.id === updated.id);
  const turns = exists
    ? session.turns.map((turn) => (turn.id === updated.id ? updated : turn))
    : [...session.turns, updated];
  return { ...session, turns };
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError) return '暂时无法连接应用，请稍后重试。';
  return error instanceof Error ? error.message : '暂时无法完成操作。';
}

export function useChat() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const request = useRef<AbortController | null>(null);
  const { drafts, setText, moveNewDraft, prepare, accept, reconcile } = useChatDrafts();
  const last = session?.turns.at(-1);
  const waitingForServer = last?.status === 'running' && !submitting;
  const sessionId = session?.id;
  const draftKey = sessionId ?? newDraftKey;
  const draft = drafts[draftKey]?.text ?? '';

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [model, history] = await Promise.all([getConfig(), listSessions()]);
        if (!active) return;
        setConfig(model);
        setSessions(history);
        const id = new URL(window.location.href).searchParams.get('session');
        if (id && history.some((item) => item.id === id)) {
          const selected = await getSession(id);
          if (active) {
            reconcile(selected);
            setSession(selected);
          }
        } else if (id) {
          showSessionInURL();
        }
      } catch (problem) {
        if (active) setError(errorMessage(problem));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [reconcile]);

  useEffect(() => {
    if (!waitingForServer || !sessionId) return;
    let active = true;
    let timer: number;
    async function refresh(id: string) {
      try {
        const updated = await getSession(id);
        if (active) {
          reconcile(updated);
          setSession(updated);
        }
        if (updated.turns.at(-1)?.status !== 'running') return;
      } catch {
        // A temporary network error can clear before the next poll.
      }
      if (active) timer = window.setTimeout(() => void refresh(id), 800);
    }
    timer = window.setTimeout(() => void refresh(sessionId), 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [reconcile, sessionId, waitingForServer]);

  const changeBlocked = loading || opening || submitting;

  async function open(id: string) {
    if (changeBlocked || session?.id === id) return;
    setOpening(true);
    setError('');
    try {
      const selected = await getSession(id);
      reconcile(selected);
      setSession(selected);
      showSessionInURL(id);
    } catch (problem) {
      setError(errorMessage(problem));
    } finally {
      setOpening(false);
    }
  }

  function startNew() {
    if (changeBlocked) return;
    setSession(null);
    setError('');
    showSessionInURL();
  }

  function remember(summary: SessionSummary) {
    setSessions((items) => [summary, ...items.filter((item) => item.id !== summary.id)]);
  }

  async function rename(title: string) {
    if (!sessionId) return;
    try {
      const renamed = await renameSession(sessionId, title);
      setSessions((items) =>
        items.map((item) => (item.id === sessionId ? { ...item, title: renamed.title } : item)),
      );
      setSession((current) =>
        current?.id === sessionId ? { ...current, title: renamed.title } : current,
      );
    } catch (problem) {
      throw new Error(errorMessage(problem));
    }
  }

  async function submit(action: { input: string } | { retryId: string }) {
    if (request.current || loading || opening || waitingForServer || !config?.configured) return;
    const controller = new AbortController();
    request.current = controller;
    setSubmitting(true);
    setError('');
    let current = session;
    try {
      if (!current) {
        const summary = await createSession(controller.signal);
        current = { ...summary, turns: [] };
        moveNewDraft(summary.id);
        remember(summary);
        setSession(current);
        showSessionInURL(summary.id);
      }
      const id = current.id;
      const streamAction =
        'input' in action ? { ...action, turnId: prepare(id, action.input) } : action;
      let turnId = 'turnId' in streamAction ? streamAction.turnId : streamAction.retryId;
      await streamTurn(id, streamAction, controller.signal, (event: ChatEvent) => {
        if (event.type === 'start') {
          turnId = event.turn.id;
          accept(id, turnId);
          remember(event.session);
        }
        setSession((value) => {
          if (!value || value.id !== id) return value;
          switch (event.type) {
            case 'start':
              return updateTurn({ ...value, ...event.session }, event.turn);
            case 'finish':
              return updateTurn(value, event.turn);
            default:
              return {
                ...value,
                turns: value.turns.map((turn) => {
                  if (turn.id !== turnId) return turn;
                  return event.type === 'text'
                    ? { ...turn, reply: turn.reply + event.delta }
                    : { ...turn, tools: updateToolRun(turn.tools, event.tool) };
                }),
              };
          }
        });
      });
    } catch (problem) {
      if (current) {
        try {
          const updated = await getSession(current.id, AbortSignal.timeout(2_500));
          reconcile(updated);
          setSession(updated);
          remember(updated);
        } catch {
          // Keep the message visible while the connection is unavailable.
        }
      }
      if (!controller.signal.aborted) setError(errorMessage(problem));
    } finally {
      request.current = null;
      setSubmitting(false);
      setStopping(false);
    }
  }

  function stop() {
    setStopping(true);
    request.current?.abort();
  }

  return {
    config,
    sessions,
    session,
    draft,
    error,
    loading,
    opening,
    submitting,
    stopping,
    waitingForServer,
    changeBlocked,
    setDraft: (value: string) => setText(draftKey, value),
    open,
    startNew,
    rename,
    submit,
    stop,
  };
}
