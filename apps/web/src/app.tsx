import { useLayoutEffect, useRef } from 'react';
import { AlertCircle, Settings2 } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatComposer } from '@/components/workbench/chat-composer';
import { Conversation } from '@/components/workbench/conversation';
import { HistoryDialog } from '@/components/workbench/history-dialog';
import { SessionTitle } from '@/components/workbench/session-title';
import { StarterPrompts } from '@/components/workbench/starter-prompts';
import { WorkbenchHeader } from '@/components/workbench/workbench-header';
import { useTheme } from '@/components/workbench/use-theme';
import { cn } from '@/lib/utils';
import { useChat } from './use-chat.js';

export function App() {
  const chat = useChat();
  const { dark, toggleTheme } = useTheme();
  const composer = useRef<HTMLTextAreaElement>(null);
  const promptSelection = useRef<[number, number] | null>(null);
  const history = useRef<HTMLDialogElement>(null);
  const turns = chat.session?.turns ?? [];
  const active = turns.length > 0 || chat.opening;
  const loading = chat.loading || chat.opening;
  const blocked = loading || chat.submitting || chat.waitingForServer;
  const canSend = Boolean(chat.config?.configured && chat.draft.trim() && !blocked);

  useLayoutEffect(() => {
    if (!promptSelection.current) return;
    composer.current?.setSelectionRange(...promptSelection.current);
    promptSelection.current = null;
  }, [chat.draft]);

  function selectSession(id: string) {
    history.current?.close();
    void chat.open(id);
  }

  function newChat() {
    chat.startNew();
    composer.current?.focus();
  }

  function choosePrompt(draft: string, promptStart: number) {
    const start = draft.indexOf('【', promptStart);
    const end = draft.indexOf('】', start);
    if (start !== -1 && end !== -1) promptSelection.current = [start, end + 1];
    chat.setDraft(draft);
    composer.current?.focus();
  }

  return (
    <div className="flex h-dvh min-w-0 flex-col">
      <WorkbenchHeader
        dark={dark}
        changeBlocked={chat.changeBlocked}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => history.current?.showModal()}
        onNewChat={newChat}
      />

      <main className={cn('flex min-h-0 flex-1 flex-col', !active && 'overflow-y-auto')}>
        <div
          className={cn(
            'mx-auto flex w-full flex-col px-4 sm:px-6',
            active
              ? 'max-w-conversation min-h-0 flex-1'
              : 'max-w-5xl gap-6 pt-11 pb-12 sm:gap-10 sm:pt-20 lg:pt-28 lg:short:gap-8 lg:short:pt-12 xl:translate-x-11 xl:px-0',
          )}
        >
          {active ? (
            <>
              <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border py-3">
                <SessionTitle
                  key={chat.session?.id}
                  title={chat.opening ? '正在打开会话' : (chat.session?.title ?? '新会话')}
                  onRename={!loading && chat.session ? chat.rename : undefined}
                  disabled={blocked}
                />
                {chat.config?.configured && (
                  <Badge variant="secondary" className="max-w-32 gap-1.5 sm:max-w-48">
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-brand-marker"
                      aria-hidden="true"
                    />
                    <span className="truncate" title={chat.config.model}>
                      {chat.config.model}
                    </span>
                  </Badge>
                )}
              </div>
              <Conversation
                key={chat.session?.id}
                turns={turns}
                loading={chat.opening}
                retryEnabled={!blocked && Boolean(chat.config?.configured)}
                onRetry={(retryId) => void chat.submit({ retryId })}
              />
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              <h1 className="text-3xl font-bold lg:relative lg:top-1 lg:text-workbench-title lg:tracking-workbench-title">
                从哪里开始选址？
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground lg:text-workbench-lead lg:tracking-wide">
                告诉我项目类型和大致区域，我可以帮你梳理选址所需资料和待核实事项。
              </p>
            </div>
          )}

          <div className={cn('flex shrink-0 flex-col gap-3', active && 'pt-3 pb-4')}>
            {chat.config && !chat.config.configured && (
              <Alert>
                <Settings2 aria-hidden="true" />
                <AlertTitle>待配置百炼</AlertTitle>
                <AlertDescription>
                  在本地 <code>.env</code> 填写百炼连接地址和 API Key 后重启应用。
                </AlertDescription>
              </Alert>
            )}
            {chat.error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{chat.error}</AlertDescription>
                {!chat.config && (
                  <AlertAction>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      重新连接
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            )}
            <ChatComposer
              inputRef={composer}
              isStarter={!active}
              draft={chat.draft}
              canSend={canSend}
              loading={loading}
              submitting={chat.submitting}
              stopping={chat.stopping}
              onDraftChange={chat.setDraft}
              onSend={() => void chat.submit({ input: chat.draft.trim() })}
              onStop={chat.stop}
            />
          </div>

          {!active && (
            <StarterPrompts draft={chat.draft} disabled={blocked} onChoose={choosePrompt} />
          )}
        </div>
      </main>

      <HistoryDialog
        dialogRef={history}
        sessions={chat.sessions}
        selectedId={chat.session?.id}
        loading={chat.loading}
        disabled={chat.changeBlocked}
        error={chat.error}
        onSelect={selectSession}
      />
      <div className="sr-only" role="status">
        {loading
          ? '正在加载会话'
          : chat.stopping
            ? '正在停止回复'
            : chat.submitting || chat.waitingForServer
              ? '正在生成回复'
              : turns.at(-1)?.status === 'completed'
                ? '回复已完成，可以继续发送消息'
                : ''}
      </div>
    </div>
  );
}
