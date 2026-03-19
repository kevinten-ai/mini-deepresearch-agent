import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LLMClient } from '../src/llm/client.js';
import { ToolRegistry } from '../src/tools/registry.js';
import { createSearchTool } from '../src/tools/search.js';
import { createVisitTool } from '../src/tools/visit.js';
import { createScholarTool } from '../src/tools/scholar.js';
import { Orchestrator } from '../src/orchestrator/orchestrator.js';
import { AgentTracer } from '../src/tracer/tracer.js';
import type { ResearchRequest, SSEEventType } from '../src/types.js';

// Allow up to 5 minutes for deep research tasks (requires Vercel Pro plan; Hobby = 60s)
export const maxDuration = 300;

function initOrchestrator(): Orchestrator {
  const llm = new LLMClient({
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.LLM_MODEL || 'glm-4-plus',
  });

  const toolRegistry = new ToolRegistry();
  if (process.env.TAVILY_API_KEY) toolRegistry.register(createSearchTool(process.env.TAVILY_API_KEY));
  if (process.env.JINA_API_KEY) toolRegistry.register(createVisitTool(process.env.JINA_API_KEY));
  if (process.env.SERPER_API_KEY) toolRegistry.register(createScholarTool(process.env.SERPER_API_KEY));
  // python and file-parser tools are not available in serverless environment

  return new Orchestrator(llm, toolRegistry);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orchestrator = initOrchestrator();

  const body = req.body as Partial<ResearchRequest>;
  const request: ResearchRequest = {
    query: body.query || '',
    mode: body.mode || 'report',
    agentCount: body.agentCount || 1,
    maxIterations: body.maxIterations || 5,
    enabledTools: body.enabledTools || ['search', 'visit', 'scholar'],
    tokenBudget: body.tokenBudget,
  };

  // SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const tracer = new AgentTracer(Date.now().toString(), request.query, request.mode);

  function sendSSE(type: SSEEventType, data: Record<string, unknown>) {
    const event = { type, data, timestamp: Date.now() };
    res.write(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  const eventTypes: SSEEventType[] = [
    'research:start', 'agent:start', 'agent:think', 'agent:act',
    'agent:tool_result', 'agent:observe', 'agent:evaluate',
    'agent:state_rebuild', 'agent:complete', 'synthesis:start',
    'synthesis:complete', 'research:complete',
  ];

  const listeners = new Map<string, (data: Record<string, unknown>) => void>();
  for (const eventType of eventTypes) {
    const listener = (data: Record<string, unknown>) => {
      sendSSE(eventType, data);
      tracer.handleEvent({ type: eventType, data, timestamp: Date.now() });
    };
    listeners.set(eventType, listener);
    orchestrator.on(eventType, listener);
  }

  try {
    const result = await orchestrator.research(request);
    sendSSE('research:complete', {
      id: result.id,
      totalDuration: result.totalDuration,
      totalTokens: result.totalTokens,
      finalOutput: result.finalOutput,
      citations: result.citations,
      trace: tracer.getTrace(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendSSE('error', { message });
  } finally {
    for (const [event, listener] of listeners) {
      orchestrator.removeListener(event, listener);
    }
    res.end();
  }
}
