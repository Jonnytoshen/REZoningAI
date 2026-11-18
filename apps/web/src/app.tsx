import { useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUp, Check, Clock3, CloudSun, FileText, MapPin,
  Menu, MessageSquare, Plus, RotateCw, Square, X,
} from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '@rezoning-ai/chat';
import type { SessionSummary, ToolRun, Turn } from '@rezoning-ai/chat';
import { useChat } from './use-chat.js';

const suggestions = [
  { icon: MapPin, label: '梳理选址输入', input: '启动一个陆上风电前期选址任务，需要先明确哪些信息？' },
  { icon: FileText, label: '准备资料清单', input: '集中式地面光伏初筛前，应准备哪些图层和资料？' },
  { icon: Clock3, label: '读取当前时间', input: '请读取当前时间，告诉我现在是北京时间几点。' },
];

const messageTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const sessionDate = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric',
});

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>REZoning<span className="brand-ai">AI</span></span>
    </div>
  );
}

function SessionNavigation({ sessions, selected, disabled, onNew, onSelect }: {
  sessions: SessionSummary[];
  selected?: string;
  disabled: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="history-nav" aria-label="聊天会话">
      <button className="new-chat" onClick={onNew} disabled={disabled}>
        <Plus size={17} aria-hidden="true" /> 新建会话
      </button>
      <h2>聊天历史</h2>
      {sessions.length === 0 && <p className="history-empty">暂无会话</p>}
      <ul className="session-list">
        {sessions.map((item) => (
          <li key={item.id}>
            <button className="session-button" disabled={disabled}
              aria-current={item.id === selected ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              <MessageSquare size={15} aria-hidden="true" />
              <span title={item.title}>{item.title}</span>
              <time dateTime={item.updatedAt}>{sessionDate.format(new Date(item.updatedAt))}</time>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ToolActivity({ tool }: { tool: ToolRun }) {
  const status = { running: '执行中', succeeded: '已完成', failed: '执行失败' }[tool.status];
  return (
    <div className="tool-activity">
      <Clock3 size={15} aria-hidden="true" />
      <span>{tool.name}</span>
      <span className={`tool-status ${tool.status}`}>
        {tool.status === 'succeeded' && <Check size={13} aria-hidden="true" />}
        {status}
      </span>
      {tool.detail && <span className="tool-detail">{tool.detail}</span>}
    </div>
  );
}

function ConversationTurn({ turn, canRetry, onRetry }: {
  turn: Turn;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const endedEarly = turn.status === 'failed' || turn.status === 'interrupted';
  return (
    <li className="turn">
      <article className="user-message">
        <div className="message-meta">
          <span>你</span>
          <time dateTime={turn.createdAt}>{messageTime.format(new Date(turn.createdAt))}</time>
        </div>
        <p className="message-text">{turn.input}</p>
      </article>
      <article className="assistant-message">
        <div className="message-meta"><CloudSun size={16} aria-hidden="true" /> <span>选址助手</span></div>
        {turn.tools.map((tool) => <ToolActivity key={tool.id} tool={tool} />)}
        {turn.reply && <p className="message-text">{turn.reply}</p>}
        {turn.status === 'running' && !turn.reply && <p className="pending-reply">正在生成回复…</p>}
        {endedEarly && (
          <div className="turn-error">
            <span>{turn.error}</span>
            {canRetry && (
              <button type="button" className="retry-button" onClick={onRetry}>
                <RotateCw size={15} aria-hidden="true" /> 重试
              </button>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

export function App() {
  const chat = useChat();
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const follow = useRef(true);
  const turns = chat.session?.turns ?? [];
  const blocked = chat.submitting || chat.waitingForServer || chat.loading || chat.opening;
  const canSend = Boolean(chat.config?.configured && chat.draft.trim() && !blocked);
  const current = chat.session?.id;

  useEffect(() => { follow.current = true; }, [current]);
  useEffect(() => {
    const area = transcript.current;
    if (area && follow.current && turns.length) area.scrollTop = area.scrollHeight;
  }, [turns]);

  function select(id: string) {
    dialog.current?.close();
    void chat.open(id);
  }

  function newChat() {
    dialog.current?.close();
    chat.startNew();
    composer.current?.focus();
  }

  function choose(input: string) {
    chat.setDraft(input);
    composer.current?.focus();
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    follow.current = true;
    void chat.submit({ input: chat.draft.trim() });
  }

  function handleEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  const navProps = {
    sessions: chat.sessions,
    selected: current,
    disabled: chat.changeBlocked,
    onNew: newChat,
    onSelect: select,
  };

  return (
    <div className="workspace">
      <aside className="desktop-history">
        <Brand />
        <SessionNavigation {...navProps} />
      </aside>

      <header className="topbar">
        <div className="current-view">
          <button className="icon-button mobile-menu" aria-label="打开聊天历史" onClick={() => dialog.current?.showModal()}>
            <Menu size={21} aria-hidden="true" />
          </button>
          <span className="desktop-view">会话工作台</span>
          <div className="mobile-brand"><Brand /></div>
        </div>
        {chat.config && (
          <span className="model-label">
            <span className={chat.config.configured ? 'model-dot ready' : 'model-dot'} aria-hidden="true" />
            {chat.config.model}
            {!chat.config.configured && <span className="model-note">待配置</span>}
          </span>
        )}
      </header>

      <main className={`sheet ${turns.length === 0 ? 'is-new' : ''}`}>
        {turns.length > 0 && (
          <div className="conversation-header">
            <h1>{chat.session?.title}</h1>
            <button className="icon-button jump-button" title="跳到最新消息" aria-label="跳到最新消息"
              onClick={() => {
                follow.current = true;
                if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
              }}
            >
              <ArrowDown size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className={`transcript ${turns.length === 0 ? 'is-empty' : ''}`} ref={transcript}
          onScroll={(event) => {
            const area = event.currentTarget;
            follow.current = area.scrollHeight - area.scrollTop - area.clientHeight < 96;
          }}
        >
          {turns.length === 0 ? (
            <section className="welcome">
              <h1>风光选址助手</h1>
              <p>从一个地区或项目类型开始，一起梳理前期选址所需的资料。</p>
              <ul className="suggestions" aria-label="对话示例">
                {suggestions.map(({ icon: Icon, label, input }) => (
                  <li key={label}>
                    <button onClick={() => choose(input)} disabled={blocked}>
                      <Icon size={16} aria-hidden="true" />
                      <span>{label}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <ol className="turns" aria-label="会话消息">
              {turns.map((turn, index) => (
                <ConversationTurn key={turn.id} turn={turn}
                  canRetry={index === turns.length - 1 && !blocked && Boolean(chat.config?.configured)}
                  onRetry={() => {
                    follow.current = true;
                    void chat.submit({ retryId: turn.id });
                  }}
                />
              ))}
            </ol>
          )}
        </div>

        <footer className="composer-area">
          {chat.config && !chat.config.configured && (
            <p className="config-notice">配置百炼连接地址和 API Key 后即可发送消息。<code>.env</code></p>
          )}
          {chat.error && (
            <div className="connection-error" role="alert">
              <span>{chat.error}</span>
              {!chat.config && <button onClick={() => location.reload()}>重新连接</button>}
            </div>
          )}
          <form className="composer" onSubmit={send}>
            <label className="sr-only" htmlFor="chat-input">消息</label>
              <textarea id="chat-input" ref={composer} rows={2} maxLength={MAX_MESSAGE_LENGTH}
              placeholder="输入选址问题或已有资料…"
              value={chat.draft} disabled={chat.loading || chat.opening} readOnly={chat.submitting}
              onChange={(event) => chat.setDraft(event.target.value)} onKeyDown={handleEnter}
            />
            <div className="composer-actions">
              <span className="compose-hint">Enter 发送 · Shift + Enter 换行</span>
              {chat.submitting ? (
                <button type="button" className="send-button" onClick={chat.stop} disabled={chat.stopping}>
                  <Square size={14} aria-hidden="true" /> {chat.stopping ? '正在停止' : '停止'}
                </button>
              ) : (
                <button type="submit" className="send-button" disabled={!canSend}>
                  <ArrowUp size={17} aria-hidden="true" /> 发送
                </button>
              )}
            </div>
          </form>
          <div className="sr-only" role="status">
            {chat.submitting || chat.waitingForServer ? '正在生成回复' : turns.length ? '可以继续发送消息' : ''}
          </div>
        </footer>
      </main>

      <dialog ref={dialog} className="history-dialog" aria-label="聊天历史">
        <div className="history-dialog-top">
          <Brand />
          <button className="icon-button" aria-label="关闭聊天历史" onClick={() => dialog.current?.close()}>
            <X size={21} aria-hidden="true" />
          </button>
        </div>
        <SessionNavigation {...navProps} />
      </dialog>
    </div>
  );
}
