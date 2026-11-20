import { Clock3, Moon, Plus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import primaryLogo from '@brand-assets/REZoningAI-logo-primary.svg';
import reversedLogo from '@brand-assets/REZoningAI-logo-reversed.svg';

interface WorkbenchHeaderProps {
  dark: boolean;
  changeBlocked: boolean;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onNewChat: () => void;
}

export function WorkbenchHeader({
  dark,
  changeBlocked,
  onToggleTheme,
  onOpenHistory,
  onNewChat,
}: WorkbenchHeaderProps) {
  const ThemeIcon = dark ? Sun : Moon;
  const themeLabel = dark ? '切换到浅色主题' : '切换到深色主题';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 sm:gap-4 md:h-20 md:pr-7 md:pl-9 lg:h-24">
      <div className="flex min-w-0 items-center gap-6">
        <img
          src={dark ? reversedLogo : primaryLogo}
          alt="REZoningAI"
          width={504}
          height={111}
          className="h-auto w-32 shrink-0 sm:w-44 lg:w-64"
        />
        <Separator
          orientation="vertical"
          className="hidden data-[orientation=vertical]:self-center lg:block lg:h-8 lg:bg-input"
        />
        <span className="hidden min-w-0 truncate font-semibold lg:block lg:text-xl xl:text-3xl">
          Agent 工作台
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3 md:gap-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <ThemeIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="toolbar"
          aria-label="聊天历史"
          aria-haspopup="dialog"
          aria-controls="workbench-history"
          title="聊天历史"
          onClick={onOpenHistory}
        >
          <Clock3 data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">聊天历史</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="toolbar"
          aria-label="新建会话"
          title="新建会话"
          onClick={onNewChat}
          disabled={changeBlocked}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">新建会话</span>
        </Button>
      </div>
    </header>
  );
}
