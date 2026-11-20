import { FileText, ListChecks, SearchCheck } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '@rezoning-ai/chat';
import { Button } from '@/components/ui/button';

const prompts = [
  {
    Icon: FileText,
    label: '梳理风电选址',
    input: '我计划在【省、市、县】开展陆上风电前期选址，还需要明确哪些信息？',
  },
  {
    Icon: ListChecks,
    label: '准备光伏资料',
    input: '我计划在【省、市、县】开展集中式地面光伏初筛，应准备哪些图层和资料？',
  },
  {
    Icon: SearchCheck,
    label: '梳理待核实事项',
    input: '请根据【项目类型、县域和已有资料】梳理待核实事项，并列出下一步需要查证的资料。',
  },
];

interface StarterPromptsProps {
  draft: string;
  disabled: boolean;
  onChoose: (draft: string, promptStart: number) => void;
}

export function StarterPrompts({ draft, disabled, onChoose }: StarterPromptsProps) {
  const prefix = draft.trim() ? `${draft}\n\n` : '';
  const atLimit = prompts.some(({ input }) => prefix.length + input.length > MAX_MESSAGE_LENGTH);

  return (
    <section aria-labelledby="starter-prompt-title" className="flex flex-col gap-3 sm:gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="starter-prompt-title" className="text-base font-semibold md:text-2xl xl:text-3xl">
          常用问题
        </h2>
        {prefix && (
          <p className="text-sm text-muted-foreground">
            {atLimit ? '草稿接近字数上限，缩短后可追加示例。' : '选择示例会追加到草稿。'}
          </p>
        )}
      </div>
      <ul className="grid divide-y divide-border overflow-hidden rounded-2xl border border-input sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {prompts.map(({ Icon, label, input }) => (
          <li key={label} className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="shortcut"
              disabled={disabled || prefix.length + input.length > MAX_MESSAGE_LENGTH}
              onClick={() => onChoose(prefix + input, prefix.length)}
            >
              <Icon data-icon="inline-start" aria-hidden="true" />
              {label}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
