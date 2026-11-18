import { Injectable } from '@nestjs/common';

@Injectable()
export class RuntimeConfig {
  readonly port = Number(process.env.PORT ?? '3000');
  readonly databasePath = process.env.DATABASE_PATH?.trim() || '.data/chat.sqlite';
  readonly model = process.env.DASHSCOPE_MODEL?.trim() || 'qwen-plus';
  readonly baseURL = process.env.DASHSCOPE_BASE_URL?.trim().replace(/\/+$/, '');
  readonly apiKey = process.env.DASHSCOPE_API_KEY?.trim();

  get configured(): boolean {
    if (!this.apiKey || !this.baseURL || /[{}]/.test(this.baseURL)) return false;
    const url = URL.parse(this.baseURL);
    return url?.protocol === 'https:' || url?.protocol === 'http:';
  }
}
