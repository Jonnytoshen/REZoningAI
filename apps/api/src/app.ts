import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { ChatController } from './chat-controller.js';
import { ChatStore } from './chat-store.js';
import { RuntimeConfig } from './config.js';
import { QwenAgent } from './qwen-agent.js';

@Module({
  controllers: [ChatController],
  providers: [
    RuntimeConfig,
    QwenAgent,
    {
      provide: ChatStore,
      inject: [RuntimeConfig],
      useFactory: (config: RuntimeConfig) => new ChatStore(config.databasePath),
    },
  ],
})
class AppModule {}

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'] });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(req.hostname);
    const origin = req.get('origin');
    if (!local || (origin && origin !== `http://${req.get('host')}`)) {
      return res.status(403).json({ message: '请从本机打开 REZoningAI。' });
    }
    next();
  });

  const web = resolve('dist/web');
  if (existsSync(resolve(web, 'index.html'))) app.useStaticAssets(web);
  return app;
}
