import { Fragment, lazy, Suspense, useRef, type ComponentType } from 'react';
import { AlertCircle, Check, Clock3, RotateCw } from 'lucide-react';
import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import type { ToolRun, Turn } from '@rezoning-ai/chat';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Message, MessageContent, MessageHeader } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Skeleton } from '@/components/ui/skeleton';
import { Trace, TraceDescription, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/trace';
import agentIcon from '@brand-assets/REZoningAI-icon-ink.svg';

const ReplyMarkdown = lazy<ComponentType<{ content: string }>>(() =>
  import('./reply-markdown').catch(() => ({
    default: ({ content }: { content: string }) => (
      <div className="wrap-anywhere whitespace-pre-wrap">{content}</div>
    ),
  })),
);

const messageTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const toolStates = {
  running: { label: '执行中', status: 'running', Icon: Clock3 },
  succeeded: { label: '已完成', status: undefined, Icon: Check },
  failed: { label: '执行失败', status: 'error', Icon: AlertCircle },
} as const;

function ToolActivity({ tool }: { tool: ToolRun }) {
  const { label, status, Icon } = toolStates[tool.status];

  return (
    <div className="flex flex-col gap-1">
      <TraceLine status={status} className="flex-wrap">
        <TraceIcon>
          <Icon aria-hidden="true" />
        </TraceIcon>
        <TraceTitle>{tool.name}</TraceTitle>
        <TraceDescription className="text-inherit">{label}</TraceDescription>
      </TraceLine>
      {tool.detail && (
        <p className="pl-6 text-sm break-words text-muted-foreground tabular-nums">{tool.detail}</p>
      )}
    </div>
  );
}

function UserMessage({ turn }: { turn: Turn }) {
  return (
    <Message align="end">
      <MessageContent>
        <MessageHeader className="gap-2">
          <span>你</span>
          <time dateTime={turn.createdAt} className="tabular-nums">
            {messageTime.format(new Date(turn.createdAt))}
          </time>
        </MessageHeader>
        <Bubble variant="secondary" align="end">
          <BubbleContent className="px-4 py-3 text-base wrap-anywhere whitespace-pre-wrap">
            {turn.input}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

interface AgentMessageProps {
  turn: Turn;
  canRetry: boolean;
  animate: boolean;
  onRetry: () => void;
}

function AgentMessage({ turn, canRetry, animate, onRetry }: AgentMessageProps) {
  const failed = turn.status === 'failed' || turn.status === 'interrupted';
  const fallback = turn.status === 'interrupted' ? '回复已停止。' : '生成回复失败。';

  return (
    <m.div
      initial={animate ? { opacity: 0.8, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <Message>
        <MessageContent className="gap-3">
          <MessageHeader className="gap-2 px-0 text-sm text-foreground">
            <img src={agentIcon} width={24} height={24} alt="" className="size-6" />
            <span>选址助手</span>
          </MessageHeader>
          {turn.tools.length > 0 && (
            <Trace className="border-l border-border pl-3">
              {turn.tools.map((tool) => (
                <ToolActivity key={tool.id} tool={tool} />
              ))}
            </Trace>
          )}
          {turn.reply && (
            <Bubble variant="ghost" className="w-full">
              <BubbleContent className="w-full text-base leading-7">
                <Suspense fallback={<Skeleton aria-hidden="true" className="h-4 w-3/4" />}>
                  <ReplyMarkdown content={turn.reply} />
                </Suspense>
              </BubbleContent>
            </Bubble>
          )}
          {turn.status === 'running' && !turn.reply && (
            <p className="text-sm text-muted-foreground">正在生成回复…</p>
          )}
          {failed && (
            <div className="flex flex-col items-start gap-2">
              <Alert variant={turn.status === 'failed' ? 'destructive' : 'default'}>
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{turn.error || fallback}</AlertDescription>
              </Alert>
              {canRetry && (
                <Button type="button" variant="outline" className="min-h-11 px-3" onClick={onRetry}>
                  <RotateCw data-icon="inline-start" aria-hidden="true" />
                  重试
                </Button>
              )}
            </div>
          )}
        </MessageContent>
      </Message>
    </m.div>
  );
}

interface ConversationProps {
  turns: Turn[];
  loading: boolean;
  retryEnabled: boolean;
  onRetry: (turnId: string) => void;
}

export function Conversation({ turns, loading, retryEnabled, onRetry }: ConversationProps) {
  const reducedMotion = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div aria-busy="true" className="flex min-h-0 flex-1 flex-col items-start gap-4 py-6">
        <Skeleton className="h-14 w-2/3 self-end" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport
            ref={viewport}
            role="region"
            aria-label="会话消息"
            tabIndex={0}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <MessageScrollerContent className="gap-7 pt-6 pb-12">
              {turns.map((turn, index) => (
                <Fragment key={turn.id}>
                  <MessageScrollerItem messageId={turn.id + ':input'} scrollAnchor>
                    <UserMessage turn={turn} />
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId={turn.id + ':reply'}>
                    <AgentMessage
                      turn={turn}
                      canRetry={retryEnabled && index === turns.length - 1}
                      animate={!reducedMotion && turn.status === 'running'}
                      onRetry={() => {
                        viewport.current?.focus({ preventScroll: true });
                        onRetry(turn.id);
                      }}
                    />
                  </MessageScrollerItem>
                </Fragment>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            aria-label="跳到最新消息"
            title="跳到最新消息"
            behavior={reducedMotion ? 'instant' : 'smooth'}
            variant="outline"
            size="icon-lg"
            className="rounded-full"
          />
        </MessageScroller>
      </MessageScrollerProvider>
    </LazyMotion>
  );
}
