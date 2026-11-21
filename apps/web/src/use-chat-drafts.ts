import { useCallback, useRef, useState } from 'react';
import type { ChatSession } from '@rezoning-ai/chat';

interface Draft {
  text: string;
  pending?: { input: string; turnId: string };
}

type Drafts = Record<string, Draft>;

const storageKey = 'rezoningai.chat-drafts';
export const newDraftKey = 'new';

function readDrafts(): Drafts {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, Draft | string>).flatMap(([key, draft]) => {
        if (typeof draft === 'string') return [[key, { text: draft }]];
        if (typeof draft?.text !== 'string') return [];
        const pending = draft.pending;
        return [
          [
            key,
            {
              text: draft.text,
              pending:
                typeof pending?.input === 'string' && typeof pending.turnId === 'string'
                  ? pending
                  : undefined,
            },
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}

export function useChatDrafts() {
  const [drafts, setDrafts] = useState(readDrafts);
  const stored = useRef(drafts);

  const commit = useCallback((updated: Drafts) => {
    stored.current = updated;
    setDrafts(updated);
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // In-memory drafts remain available if storage is blocked or full.
    }
  }, []);

  const setEntry = useCallback(
    (key: string, draft: Draft) => {
      const updated = { ...stored.current };
      if (draft.text || draft.pending) updated[key] = draft;
      else delete updated[key];
      commit(updated);
    },
    [commit],
  );

  const accept = useCallback(
    (key: string, turnId: string) => {
      const draft = stored.current[key];
      if (draft?.pending?.turnId === turnId) {
        setEntry(key, { text: draft.text.trim() === draft.pending.input ? '' : draft.text });
      }
    },
    [setEntry],
  );

  const reconcile = useCallback(
    (session: ChatSession) => {
      const pending = stored.current[session.id]?.pending;
      if (pending && session.turns.some(({ id }) => pending.turnId === id)) {
        accept(session.id, pending.turnId);
      }
    },
    [accept],
  );

  function moveNewDraft(id: string) {
    const { [newDraftKey]: draft, ...remaining } = stored.current;
    if (draft) commit({ ...remaining, [id]: draft });
  }

  function prepare(key: string, input: string) {
    const draft = stored.current[key];
    if (draft?.pending?.input === input) return draft.pending.turnId;
    const turnId = crypto.randomUUID();
    setEntry(key, { text: draft?.text ?? input, pending: { input, turnId } });
    return turnId;
  }

  return {
    drafts,
    setText: (key: string, text: string) => setEntry(key, { ...stored.current[key], text }),
    moveNewDraft,
    prepare,
    accept,
    reconcile,
  };
}
