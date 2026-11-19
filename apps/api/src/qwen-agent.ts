import { Inject, Injectable } from '@nestjs/common';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { stepCountIs, streamText, tool } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import type { ChatEvent, Turn } from '@rezoning-ai/chat';
import { RuntimeConfig } from './config.js';

const SYSTEM_PROMPT = `你是 REZoningAI 的风光项目前期选址助手，面向中国大陆陆上风电和集中式地面光伏项目的开发人员。
使用用户的语言作答。你可以帮助梳理搜索范围、项目类型、资料清单、判断依据和待核实事项。
目前没有空间分析工具或已确认的图层。用户要求筛选具体片区时，说明已知信息和下一步所需资料。
候选区边界和空间筛选结论必须来自实际空间工具结果。不得编造候选区、图层、政策依据或已经完成的检查。
用户询问现在的时间或日期时，调用 get_current_time，并根据工具返回的时间和时区回答。`;

const TIME_ZONE = 'Asia/Shanghai';
const MAX_STEPS = 3;
const formatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'medium',
  hourCycle: 'h23',
});

const tools = {
  get_current_time: tool({
    description: '读取服务端当前时间。用户询问现在的日期或时间时调用此工具。',
    inputSchema: z.object({}),
    execute: () => {
      const now = new Date();
      return { iso: now.toISOString(), timeZone: TIME_ZONE, display: formatter.format(now) };
    },
  }),
};

type GenerationEvent = Extract<ChatEvent, { type: 'text' | 'tool' }>;

@Injectable()
export class QwenAgent {
  constructor(@Inject(RuntimeConfig) private readonly config: RuntimeConfig) {}

  async generate(
    history: ModelMessage[],
    turn: Turn,
    signal: AbortSignal,
    emit: (event: GenerationEvent) => void,
  ): Promise<ModelMessage[]> {
    const provider = createOpenAICompatible({
      name: 'dashscope',
      baseURL: this.config.baseURL!,
      apiKey: this.config.apiKey!,
    });
    const result = streamText({
      model: provider.chatModel(this.config.model),
      system: SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: turn.input }],
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      prepareStep: ({ stepNumber }) => (stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : {}),
      providerOptions: {
        dashscope: { enable_thinking: false, parallel_tool_calls: false },
      },
      abortSignal: signal,
      timeout: { totalMs: 90_000 },
      maxRetries: 0,
      onError: () => undefined, // The stream error is handled below by the application.
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          emit({ type: 'text', delta: part.text });
          break;
        case 'tool-call':
        case 'tool-result':
        case 'tool-error':
          emit({
            type: 'tool',
            tool: {
              id: part.toolCallId,
              name: part.toolName === 'get_current_time' ? '读取当前时间' : part.toolName,
              status:
                part.type === 'tool-call'
                  ? 'running'
                  : part.type === 'tool-result'
                    ? 'succeeded'
                    : 'failed',
              detail:
                part.type === 'tool-result' && !part.dynamic && part.toolName === 'get_current_time'
                  ? `${part.output.display}（北京时间）`
                  : undefined,
            },
          });
          break;
        case 'error':
          throw part.error;
        case 'abort':
          throw signal.reason ?? new Error('Model response aborted');
      }
    }

    signal.throwIfAborted();
    if (!turn.reply.trim() || (await result.finishReason) === 'error') {
      throw new Error('Model returned no usable response');
    }
    return await result.responseMessages;
  }
}
