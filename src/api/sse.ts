import type { Response } from 'express';
import type { SSEEvent, SSEEventType } from '../types.js';

export class SSEWriter {
  private res: Response;

  constructor(res: Response) {
    this.res = res;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
  }

  send(type: SSEEventType, data: Record<string, unknown>): void {
    const event: SSEEvent = { type, data, timestamp: Date.now() };
    this.res.write(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  close(): void {
    this.res.end();
  }
}
