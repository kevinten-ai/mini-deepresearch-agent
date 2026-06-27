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

// Detect actual function timeout: Vercel Hobby=60s, Pro=maxDuration
// Leave safety margin for synthesis + cleanup
const FUNCTION_TIMEOUT_MS = (parseInt(process.env.FUNCTION_TIMEOUT || '60', 10)) * 1000;
const SAFETY_MARGIN_MS = 10_000;
const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';
const DEFAULT_ARK_MODEL = 'doubao-seed-2-0-code-preview-260215';

function initOrchestrator(): Orchestrator {
  const llm = new LLMClient({
    apiKey: process.env.ARK_API_KEY || '',
    baseURL: process.env.ARK_BASE_URL || DEFAULT_ARK_BASE_URL,
    model: process.env.ARK_CHAT_MODEL || DEFAULT_ARK_MODEL,
    image: {
      apiKey: process.env.ARK_IMAGE_API_KEY || '',
      baseURL: process.env.ARK_IMAGE_BASE_URL || '',
      model: process.env.ARK_IMAGE_MODEL || '',
    },
    video: {
      apiKey: process.env.ARK_VIDEO_API_KEY || '',
      baseURL: process.env.ARK_VIDEO_BASE_URL || '',
      model: process.env.ARK_VIDEO_MODEL || '',
    },
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
  // Auto-limit iterations based on available time
  // Each iteration ~15-30s (LLM call + tool call), so on Hobby (60s) we can do ~2 iterations
  const maxSafeIterations = Math.max(1, Math.floor((FUNCTION_TIMEOUT_MS - SAFETY_MARGIN_MS) / 25_000));
  const requestedIterations = body.maxIterations || 5;

  const request: ResearchRequest = {
    query: body.query || '',
    mode: body.mode || 'report',
    agentCount: body.agentCount || 1,
    maxIterations: Math.min(requestedIterations, maxSafeIterations),
    enabledTools: body.enabledTools || ['search', 'visit', 'scholar'],
    tokenBudget: body.tokenBudget,
  };

  // SSE streaming headers — flush immediately to establish connection
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  // Send initial comment to confirm stream is open
  res.write(`:connected ${Date.now()}\n\n`);

  // Set up deadline: abort agents gracefully before Vercel kills the function
  const functionStart = Date.now();
  const deadline = functionStart + FUNCTION_TIMEOUT_MS - SAFETY_MARGIN_MS;
  const abortController = new AbortController();
  const deadlineTimer = setTimeout(() => {
    console.log(`[deadline] Aborting research at ${FUNCTION_TIMEOUT_MS / 1000}s timeout`);
    abortController.abort();
  }, FUNCTION_TIMEOUT_MS - SAFETY_MARGIN_MS);

  const tracer = new AgentTracer(Date.now().toString(), request.query, request.mode);

  function sendSSE(type: SSEEventType, data: Record<string, unknown>) {
    try {
      const event = { type, data, timestamp: Date.now() };
      res.write(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Connection may already be closed
    }
  }

  const eventTypes: SSEEventType[] = [
    'research:start', 'agent:start', 'agent:think', 'agent:act',
    'agent:tool_result', 'agent:observe', 'agent:evaluate',
    'agent:state_rebuild', 'agent:complete', 'agent:token',
    'synthesis:start', 'synthesis:token', 'synthesis:complete',
    'media:start', 'media:progress', 'media:complete',
    'research:complete',
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

  // Heartbeat: send SSE comment every 15s to prevent proxy/browser idle timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  try {
    const result = await orchestrator.research(request, {
      deadline,
      signal: abortController.signal,
    });
    sendSSE('research:complete', {
      id: result.id,
      totalDuration: result.totalDuration,
      totalTokens: result.totalTokens,
      finalOutput: result.finalOutput,
      citations: result.citations,
      trace: tracer.getTrace(),
      timeLimited: abortController.signal.aborted,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error('[research error]', rawMessage, stack);

    // Classify error for better user-facing messages
    let message = rawMessage;
    if (abortController.signal.aborted || rawMessage.includes('Aborted by deadline')) {
      message = `Research was time-limited (${FUNCTION_TIMEOUT_MS / 1000}s serverless timeout). Results may be partial. Consider reducing agent count or iterations.`;
    } else if (rawMessage.includes('API key') || rawMessage.includes('401') || rawMessage.includes('Unauthorized')) {
      message = 'API authentication failed. Please check your ARK_API_KEY configuration.';
    } else if (rawMessage.includes('429') || rawMessage.includes('rate limit') || rawMessage.includes('Rate limit')) {
      message = 'API rate limit exceeded. Please wait a moment and try again.';
    } else if (rawMessage.includes('timeout') || rawMessage.includes('ETIMEDOUT') || rawMessage.includes('ECONNRESET')) {
      message = 'Connection to the LLM API timed out. The service may be overloaded — please retry.';
    } else if (rawMessage.includes('ENOTFOUND') || rawMessage.includes('ECONNREFUSED')) {
      message = 'Cannot reach the LLM API server. Please check your ARK_BASE_URL configuration.';
    } else if (rawMessage.includes('All') && rawMessage.includes('agents failed')) {
      message = rawMessage;
    } else if (!rawMessage || rawMessage === 'undefined') {
      message = 'An unexpected error occurred during research. Please check the server logs and try again.';
    }

    sendSSE('error', { message, raw: rawMessage.slice(0, 200) });
  } finally {
    clearTimeout(deadlineTimer);
    clearInterval(heartbeat);
    for (const [event, listener] of listeners) {
      orchestrator.removeListener(event, listener);
    }
    res.end();
  }
}
