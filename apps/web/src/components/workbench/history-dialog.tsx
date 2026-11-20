import { useRef, useState } from 'react';
import type { Ref } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { SessionSummary } from '@rezoning-ai/chat';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const date = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface HistoryDialogProps {
  dialogRef: Ref<HTMLDialogElement>;
  sessions: SessionSummary[];
  selectedId?: string;
  loading: boolean;
  disabled: boolean;
  error: string;
  onSelect: (id: string) => void;
}

export function HistoryDialog({
  dialogRef,
  sessions,
  selectedId,
  loading,
  disabled,
  error,
  onSelect,
}: HistoryDialogProps) {
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  const matches = keyword
    ? sessions.filter(({ title, latestInput }) =>
        [title, latestInput].some((text) => text?.toLocaleLowerCase('zh-CN').includes(keyword)),
      )
    : sessions;

  return (
    <dialog
      ref={dialogRef}
      id="workbench-history"
      aria-labelledby="workbench-history-title"
      closedby="any"
      onClose={() => setQuery('')}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-sm flex-col overscroll-contain border-l border-border bg-background text-foreground backdrop:bg-black/35 open:flex"
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
        <h2 id="workbench-history-title" className="text-lg font-semibold">
          聊天历史
        </h2>
        <form method="dialog">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="关闭聊天历史"
          >
            <X aria-hidden="true" />
          </Button>
        </form>
      </header>
      {sessions.length > 0 && (
        <FieldGroup className="shrink-0 px-5 pt-4">
          <Field>
            <FieldLabel htmlFor="history-search">搜索会话</FieldLabel>
            <Input
              id="history-search"
              ref={search}
              type="search"
              placeholder="标题或提问摘要"
              className="h-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
        </FieldGroup>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div aria-label="正在加载聊天历史" aria-busy="true" className="flex flex-col gap-3 px-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <Empty className="border-0 p-6">
            <EmptyHeader>
              <EmptyTitle>{error ? '暂时无法读取历史' : '暂无会话'}</EmptyTitle>
              <EmptyDescription>{error || '发起咨询后，会话会显示在这里。'}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : matches.length === 0 ? (
          <Empty className="border-0 p-6">
            <EmptyHeader>
              <EmptyTitle>没有匹配的会话</EmptyTitle>
              <EmptyDescription>试试项目名称或提问摘要中的关键词。</EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 px-3"
              onClick={() => {
                setQuery('');
                search.current?.focus();
              }}
            >
              清除搜索
            </Button>
          </Empty>
        ) : (
          <nav aria-label="会话列表">
            <ul className="flex flex-col gap-1">
              {matches.map((session) => (
                <li key={session.id}>
                  <Button
                    type="button"
                    variant={session.id === selectedId ? 'secondary' : 'ghost'}
                    aria-current={session.id === selectedId ? 'page' : undefined}
                    disabled={disabled}
                    className="h-auto min-h-11 w-full min-w-0 items-start justify-start gap-3 px-3 py-3 text-left whitespace-normal"
                    onClick={() => onSelect(session.id)}
                  >
                    <MessageSquare data-icon="inline-start" aria-hidden="true" className="mt-1" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1 wrap-anywhere">
                      <span className="font-semibold">{session.title}</span>
                      {session.latestInput && session.latestInput !== session.title && (
                        <span className="line-clamp-2 font-normal text-muted-foreground">
                          {session.latestInput}
                        </span>
                      )}
                      <time
                        dateTime={session.updatedAt}
                        className="text-xs font-normal text-muted-foreground tabular-nums"
                      >
                        {date.format(new Date(session.updatedAt))}
                      </time>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </dialog>
  );
}
