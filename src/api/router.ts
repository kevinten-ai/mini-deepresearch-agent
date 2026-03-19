import { Router, type Request, type Response } from 'express';
import { SSEWriter } from './sse.js';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { AgentTracer } from '../tracer/tracer.js';
import type { ResearchRequest, SSEEventType } from '../types.js';

export function createRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.post('/api/research', async (req: Request, res: Response) => {
    const body = req.body as Partial<ResearchRequest>;
    const request: ResearchRequest = {
      query: body.query || '',
      mode: body.mode || 'report',
      agentCount: body.agentCount || 1,
      maxIterations: body.maxIterations || 5,
      enabledTools: body.enabledTools || ['search', 'visit', 'scholar'],
      tokenBudget: body.tokenBudget,
    };

    const sse = new SSEWriter(res);
    const tracer = new AgentTracer(
      Date.now().toString(),
      request.query,
      request.mode,
    );

    const events: SSEEventType[] = [
      'research:start', 'agent:start', 'agent:think', 'agent:act',
      'agent:tool_result', 'agent:observe', 'agent:evaluate',
      'agent:state_rebuild', 'agent:complete', 'synthesis:start',
      'synthesis:complete', 'research:complete',
    ];

    const listeners = new Map<string, (data: Record<string, unknown>) => void>();
    for (const event of events) {
      const listener = (data: Record<string, unknown>) => {
        sse.send(event, data);
        tracer.handleEvent({ type: event, data, timestamp: Date.now() });
      };
      listeners.set(event, listener);
      orchestrator.on(event, listener);
    }

    try {
      const result = await orchestrator.research(request);
      sse.send('research:complete', {
        id: result.id,
        totalDuration: result.totalDuration,
        totalTokens: result.totalTokens,
        finalOutput: result.finalOutput,
        citations: result.citations,
        trace: tracer.getTrace(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      sse.send('error', { message });
    } finally {
      for (const [event, listener] of listeners) {
        orchestrator.removeListener(event, listener);
      }
      sse.close();
    }
  });

  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return router;
}
