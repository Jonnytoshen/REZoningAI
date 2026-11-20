import type { FormEvent, KeyboardEvent, Ref } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '@rezoning-ai/chat';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  inputRef: Ref<HTMLTextAreaElement>;
  isStarter: boolean;
  draft: string;
  canSend: boolean;
  loading: boolean;
  submitting: boolean;
  stopping: boolean;
  onDraftChange: (draft: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatComposer({
  inputRef,
  isStarter,
  draft,
  canSend,
  loading,
  submitting,
  stopping,
  onDraftChange,
  onSend,
  onStop,
}: ChatComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form aria-label="发送消息" onSubmit={submit}>
      <FieldGroup>
        <Field data-disabled={loading || undefined}>
          <FieldLabel htmlFor="chat-input" className="sr-only">
            消息
          </FieldLabel>
          <InputGroup className="rounded-2xl bg-card shadow-none dark:bg-card">
            <InputGroupTextarea
              id="chat-input"
              ref={inputRef}
              className={cn(
                'max-h-60 overflow-y-auto px-4 pt-4 text-base sm:px-6 sm:pt-5',
                isStarter
                  ? 'min-h-28 lg:min-h-44.5 lg:text-2xl lg:tracking-wide lg:short:min-h-36'
                  : 'min-h-16',
              )}
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={isStarter ? '输入选址问题或已有资料…' : '继续追问或补充资料…'}
              aria-describedby="compose-keyboard-hint"
              value={draft}
              disabled={loading}
              readOnly={submitting}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <InputGroupAddon
              align="block-end"
              className="justify-end px-3 pb-3 sm:justify-between sm:px-4 sm:pb-4"
            >
              <p
                id="compose-keyboard-hint"
                className="hidden pl-2 text-sm font-normal sm:block lg:text-lg"
              >
                Enter 发送 · Shift + Enter 换行
              </p>
              <Button
                type={submitting ? 'button' : 'submit'}
                size="send"
                variant={submitting ? 'outline' : 'default'}
                aria-disabled={submitting ? stopping : !canSend}
                onClick={submitting && !stopping ? onStop : undefined}
              >
                {submitting ? (
                  <Square data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <ArrowUp data-icon="inline-start" aria-hidden="true" />
                )}
                {submitting ? (stopping ? '正在停止' : '停止') : '发送'}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </form>
  );
}
