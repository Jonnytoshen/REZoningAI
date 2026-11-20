import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { MAX_SESSION_TITLE_LENGTH } from '@rezoning-ai/chat';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface SessionTitleProps {
  title: string;
  disabled: boolean;
  onRename?: (title: string) => Promise<void>;
}

export function SessionTitle({ title, disabled, onRename }: SessionTitleProps) {
  const formId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);

  function closeEditor() {
    setDraft(null);
    setError('');
    trigger.current?.focus();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft?.trim();
    if (!onRename || !next || disabled || saving) return;
    if (next === title) {
      closeEditor();
      return;
    }
    setSaving(true);
    setError('');
    input.current?.focus();
    try {
      await onRename(next);
      closeEditor();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : '暂时无法保存名称，请重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="min-w-0 text-lg leading-snug font-semibold wrap-anywhere">{title}</h1>
        {onRename && (
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="重命名会话"
            aria-expanded={editing}
            aria-controls={editing ? formId : undefined}
            title="重命名会话"
            disabled={disabled}
            onClick={() => {
              if (saving) return;
              if (editing) closeEditor();
              else setDraft(title);
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </div>
      {editing && (
        <form
          id={formId}
          aria-label="重命名会话"
          onSubmit={save}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.nativeEvent.isComposing && !saving) closeEditor();
          }}
        >
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={`${formId}-title`}>会话名称</FieldLabel>
              <Input
                ref={input}
                id={`${formId}-title`}
                className="h-11"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_SESSION_TITLE_LENGTH}
                required
                readOnly={saving}
                aria-describedby={error ? `${formId}-error` : undefined}
              />
              {error && <FieldError id={`${formId}-error`}>{error}</FieldError>}
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" className="min-h-11 px-3" disabled={saving || !draft.trim()}>
                {saving ? '正在保存' : '保存名称'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-3"
                disabled={saving}
                onClick={closeEditor}
              >
                取消
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
