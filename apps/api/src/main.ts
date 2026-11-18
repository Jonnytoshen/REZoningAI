import 'reflect-metadata';
import { createApp } from './app.js';
import { ChatStore } from './chat-store.js';
import { RuntimeConfig } from './config.js';

const app = await createApp();
app.enableShutdownHooks();
await app.listen(app.get(RuntimeConfig).port, '127.0.0.1');
app.get(ChatStore).recoverInterruptedTurns();
console.log(`REZoningAI · ${await app.getUrl()}`);
