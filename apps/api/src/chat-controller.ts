import {
  BadRequestException, Body, Controller, Get, Inject, Param,
  Post, Res, ServiceUnavailableException,
} from '@nestjs/common';
import type { BeforeApplicationShutdown } from '@nestjs/common';
import type { ModelMessage } from 'ai';
import type { Response } from 'express';
import { z } from 'zod';
import { MAX_MESSAGE_LENGTH, updateToolRun } from '../../../shared/chat.js';
import type { ChatEvent, ModelConfig } from '../../../shared/chat.js';
import { ChatStore } from './chat-store.js';
import type { TurnReceipt } from './chat-store.js';
import { RuntimeConfig } from './config.js';
import { QwenAgent } from './qwen-agent.js';

const newMessage = z.object({ input: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH), turnId: z.uuid() });

@Controller('api')
export class ChatController implements BeforeApplicationShutdown {
  private readonly activeStreams = new Set<AbortController>();

  constructor(
    @Inject(ChatStore) private readonly store: ChatStore,
    @Inject(RuntimeConfig) private readonly config: RuntimeConfig,
    @Inject(QwenAgent) private readonly agent: QwenAgent,
  ) {}

  beforeApplicationShutdown(): void {
    for (const stream of this.activeStreams) stream.abort();
  }

  @Get('config')
  getConfig(): ModelConfig {
    return { model: this.config.model, configured: this.config.configured };
  }

  @Get('sessions')
  listSessions() {
    return this.store.listSessions();
  }

  @Post('sessions')
  createSession() {
    return this.store.createSession();
  }

  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.store.getSession(sessionId);
  }

  @Post('sessions/:sessionId/turns')
  async send(
    @Param('sessionId') sessionId: string, @Body() body: unknown, @Res() res: Response,
  ): Promise<void> {
    this.requireModel();
    const parsed = newMessage.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(`请输入 1 至 ${MAX_MESSAGE_LENGTH} 个字符。`);
    }
    await this.stream(this.store.begin(sessionId, parsed.data.input, parsed.data.turnId), res);
  }

  @Post('sessions/:sessionId/turns/:turnId/retry')
  async retry(
    @Param('sessionId') sessionId: string, @Param('turnId') turnId: string, @Res() res: Response,
  ): Promise<void> {
    this.requireModel();
    await this.stream(this.store.retry(sessionId, turnId), res);
  }

  private requireModel(): void {
    if (!this.config.configured) {
      throw new ServiceUnavailableException('请在服务端配置百炼连接地址和 API Key。');
    }
  }

  private async stream(
    { session, turn, replay }: TurnReceipt, res: Response,
  ): Promise<void> {
    const emit = (event: ChatEvent) => {
      if (!res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    emit({ type: 'start', session, turn });
    if (replay) {
      emit({ type: 'finish', turn });
      res.end();
      return;
    }

    const controller = new AbortController();
    const disconnect = () => controller.abort();
    let messages: ModelMessage[] | undefined;
    this.activeStreams.add(controller);
    res.once('close', disconnect);
    try {
      messages = await this.agent.generate(
        this.store.modelHistory(session.id, turn.id), turn, controller.signal, (event) => {
          if (event.type === 'text') turn.reply += event.delta;
          else turn.tools = updateToolRun(turn.tools, event.tool);
          emit(event);
        },
      );
      turn.status = 'completed';
    } catch {
      turn.status = controller.signal.aborted ? 'interrupted' : 'failed';
      turn.error = turn.status === 'interrupted'
        ? '回复已中断，可以重试这条消息。'
        : '模型暂时未能完成回复。请检查模型配置或连接后重试。';
      turn.tools = turn.tools.map((item) => item.status === 'running'
        ? { ...item, status: 'failed' } : item);
    } finally {
      res.off('close', disconnect);
      this.activeStreams.delete(controller);
      try {
        this.store.finish(turn, messages);
        emit({ type: 'finish', turn });
      } finally {
        if (!res.destroyed) res.end();
      }
    }
  }
}
