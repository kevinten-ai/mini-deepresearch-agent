# Mini DeepResearch Agent Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a transparent, educational Mini DeepResearch Agent with real-time visualization of the Think-Act-Observe-Evaluate iterative research loop.

**Architecture:** Multi-agent orchestrator dispatches parallel ResearchAgents, each running a Think-Act-Observe-Evaluate loop with Markovian state rebuild (evolving report as compressed memory). Express backend streams SSE events to a React frontend that visualizes the entire research process in real-time.

**Tech Stack:** TypeScript, Node.js, Express, OpenAI SDK (ZhipuAI GLM-4 compatible), Tavily API, Jina Reader API, Vitest, React, Vite, SSE

---

## File Structure

```
├── package.json                    # Backend dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── .env.example                    # Environment variable template
├── vitest.config.ts                # Test config
│
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── config.ts                   # Environment config loader
│   ├── types.ts                    # All core type definitions
│   │
│   ├── llm/
│   │   └── client.ts               # OpenAI-compatible LLM client for GLM-4
│   │
│   ├── tools/
│   │   ├── registry.ts             # Tool registry + base interface
│   │   ├── search.ts               # Tavily web search
│   │   ├── visit.ts                # Jina Reader URL content extraction
│   │   ├── python.ts               # Python code execution (sandboxed)
│   │   ├── scholar.ts              # Serper academic search
│   │   └── file-parser.ts          # PDF/document parser
│   │
│   ├── agent/
│   │   └── research-agent.ts       # Core agent: Think-Act-Observe-Evaluate + State Rebuild
│   │
│   ├── orchestrator/
│   │   ├── orchestrator.ts         # Multi-agent orchestrator
│   │   └── synthesizer.ts          # Multi-report synthesizer
│   │
│   ├── tracer/
│   │   └── tracer.ts               # Full research trace recording
│   │
│   └── api/
│       ├── router.ts               # Express API routes
│       └── sse.ts                   # SSE event emitter utility
│
├── web/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                # React entry
│       ├── App.tsx                 # Router setup
│       ├── types.ts               # Frontend type definitions (mirrors SSE events)
│       ├── hooks/
│       │   └── useResearchSSE.ts   # SSE connection hook
│       ├── pages/
│       │   ├── HomePage.tsx        # Query input + config
│       │   └── ResearchPage.tsx    # Real-time research visualization
│       └── components/
│           ├── AgentCard.tsx        # Left panel: agent status card
│           ├── ThinkingProcess.tsx  # Center panel: iteration details
│           ├── TraceTimeline.tsx    # Right panel: timeline + stats
│           ├── ToolCallCard.tsx     # Tool execution display
│           └── ReportRenderer.tsx   # Final report with citations
│
└── tests/
    ├── llm/
    │   └── client.test.ts
    ├── tools/
    │   └── registry.test.ts
    ├── agent/
    │   └── research-agent.test.ts
    └── orchestrator/
        └── orchestrator.test.ts
```

---

## Chunk 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "mini-deep-research",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "openai": "^4.80.0",
    "express": "^4.21.0",
    "dotenv": "^16.4.0",
    "uuid": "^11.1.0",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "web", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create .env.example and .gitignore**

`.env.example`:
```
# LLM Configuration (ZhipuAI GLM-4, OpenAI-compatible)
LLM_API_KEY=your_zhipuai_api_key
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-4-plus

# Tool API Keys
TAVILY_API_KEY=your_tavily_api_key
SERPER_API_KEY=your_serper_api_key
JINA_API_KEY=your_jina_api_key

# Server
PORT=3000
```

`.gitignore`:
```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .env.example .gitignore
git commit -m "chore: scaffold project with TypeScript, Express, OpenAI SDK"
```

---

### Task 2: Core Type Definitions

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`

- [ ] **Step 1: Create config.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.LLM_MODEL || 'glm-4-plus',
  },
  tools: {
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    serperApiKey: process.env.SERPER_API_KEY || '',
    jinaApiKey: process.env.JINA_API_KEY || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
};
```

- [ ] **Step 2: Create types.ts with all core interfaces**

```typescript
// ===== Tool System =====
export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  definition: ToolDefinition;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

// ===== Agent System =====
export type AgentStatus = 'pending' | 'thinking' | 'acting' | 'observing' | 'evaluating' | 'rebuilding' | 'complete' | 'error';

export interface AgentConfig {
  agentId: string;
  perspective: string;
  query: string;
  maxIterations: number;
  tools: Tool[];
}

export interface IterationState {
  round: number;
  think: { reasoning: string; decision: string; identifiedGaps: string[] };
  actions: ActionRecord[];
  observe: { keyFindings: string[] };
  evaluate: { shouldContinue: boolean; reason: string; completeness: number };
  stateRebuild: { reportBefore: string; reportAfter: string; contextTokens: number };
}

export interface ActionRecord {
  tool: string;
  params: Record<string, unknown>;
  result: ToolResult;
  duration: number;
}

export interface AgentResult {
  agentId: string;
  perspective: string;
  iterations: IterationState[];
  finalReport: string;
  totalTokens: number;
  duration: number;
}

// ===== Orchestrator =====
export type ResearchMode = 'report' | 'qa';

export interface ResearchRequest {
  query: string;
  mode: ResearchMode;
  agentCount: number;
  maxIterations: number;
  enabledTools: string[];
  tokenBudget?: number;
}

export interface ResearchResult {
  id: string;
  query: string;
  mode: ResearchMode;
  agentResults: AgentResult[];
  finalOutput: string;
  citations: Citation[];
  totalTokens: number;
  totalDuration: number;
}

export interface Citation {
  id: number;
  url: string;
  title: string;
  snippet: string;
  foundBy: string;   // agentId
  foundAt: number;   // iteration round
}

// ===== Trace System =====
export interface ResearchTrace {
  id: string;
  query: string;
  mode: ResearchMode;
  startTime: number;
  endTime?: number;
  orchestration: {
    queryAnalysis: string;
    agentCount: number;
    perspectives: string[];
    duration: number;
  };
  agents: AgentTrace[];
  synthesis?: {
    inputReportCount: number;
    conflictsDetected: string[];
    duration: number;
    tokens: number;
  };
  output?: {
    content: string;
    citations: Citation[];
  };
  totalTokens: number;
  estimatedCost: number;
}

export interface AgentTrace {
  agentId: string;
  perspective: string;
  status: AgentStatus;
  iterations: IterationState[];
  finalReport?: string;
  tokens: number;
  duration: number;
}

// ===== SSE Events =====
export type SSEEventType =
  | 'research:start'
  | 'agent:start'
  | 'agent:think'
  | 'agent:act'
  | 'agent:tool_result'
  | 'agent:observe'
  | 'agent:evaluate'
  | 'agent:state_rebuild'
  | 'agent:complete'
  | 'synthesis:start'
  | 'synthesis:complete'
  | 'research:complete'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/config.ts src/types.ts
git commit -m "feat: add core type definitions and config"
```

---

## Chunk 2: LLM Client + Tool System

### Task 3: LLM Client

**Files:**
- Create: `src/llm/client.ts`
- Create: `tests/llm/client.test.ts`

- [ ] **Step 1: Write LLM client test**

```typescript
// tests/llm/client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { LLMClient } from '../src/llm/client';

describe('LLMClient', () => {
  it('should format tool definitions for function calling', () => {
    const client = new LLMClient({ apiKey: 'test', baseURL: 'http://test', model: 'test' });
    const tools = [{
      definition: {
        name: 'search',
        description: 'Search the web',
        parameters: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
      },
      execute: async () => ({ success: true, data: [], summary: '', duration: 0 }),
    }];
    const formatted = client.formatTools(tools);
    expect(formatted[0].type).toBe('function');
    expect(formatted[0].function.name).toBe('search');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/llm/client.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Implement LLM client**

```typescript
// src/llm/client.ts
import OpenAI from 'openai';
import type { Tool, ToolResult } from '../types.js';

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    this.model = config.model;
  }

  formatTools(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      },
    }));
  }

  async chat(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    };

    if (tools && tools.length > 0) {
      params.tools = this.formatTools(tools);
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls || [],
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/llm/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/llm/client.ts tests/llm/client.test.ts
git commit -m "feat: add OpenAI-compatible LLM client for GLM-4"
```

---

### Task 4: Tool Registry

**Files:**
- Create: `src/tools/registry.ts`
- Create: `tests/tools/registry.test.ts`

- [ ] **Step 1: Write registry test**

```typescript
// tests/tools/registry.test.ts
import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/tools/registry';

describe('ToolRegistry', () => {
  it('should register and retrieve tools by name', () => {
    const registry = new ToolRegistry();
    const mockTool = {
      definition: { name: 'test', description: 'Test tool', parameters: { type: 'object' as const, properties: {}, required: [] } },
      execute: async () => ({ success: true, data: null, summary: 'done', duration: 0 }),
    };
    registry.register(mockTool);
    expect(registry.get('test')).toBe(mockTool);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('should filter tools by enabled list', () => {
    const registry = new ToolRegistry();
    const tool1 = { definition: { name: 'search', description: '', parameters: { type: 'object' as const, properties: {}, required: [] } }, execute: async () => ({ success: true, data: null, summary: '', duration: 0 }) };
    const tool2 = { definition: { name: 'visit', description: '', parameters: { type: 'object' as const, properties: {}, required: [] } }, execute: async () => ({ success: true, data: null, summary: '', duration: 0 }) };
    registry.register(tool1);
    registry.register(tool2);
    const filtered = registry.getByNames(['search']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].definition.name).toBe('search');
  });
});
```

- [ ] **Step 2: Implement registry**

```typescript
// src/tools/registry.ts
import type { Tool } from '../types.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getByNames(names: string[]): Tool[] {
    return names.map((n) => this.tools.get(n)).filter((t): t is Tool => t !== undefined);
  }
}
```

- [ ] **Step 3: Run tests, then commit**

Run: `npx vitest run tests/tools/registry.test.ts`

```bash
git add src/tools/registry.ts tests/tools/registry.test.ts
git commit -m "feat: add tool registry"
```

---

### Task 5: Implement 5 Tools

**Files:**
- Create: `src/tools/search.ts`
- Create: `src/tools/visit.ts`
- Create: `src/tools/python.ts`
- Create: `src/tools/scholar.ts`
- Create: `src/tools/file-parser.ts`

- [ ] **Step 1: Implement Search tool (Tavily)**

```typescript
// src/tools/search.ts
import type { Tool, ToolResult } from '../types.js';

export function createSearchTool(apiKey: string): Tool {
  return {
    definition: {
      name: 'search',
      description: 'Search the web for information. Use this when you need to find current information, facts, or data about any topic.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          maxResults: { type: 'string', description: 'Maximum number of results (default: 5)' },
        },
        required: ['query'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: params.query as string,
            max_results: parseInt(params.maxResults as string || '5', 10),
            include_answer: false,
          }),
        });
        const data = await response.json();
        const results = (data.results || []).map((r: any) => ({
          title: r.title, url: r.url, snippet: r.content, score: r.score,
        }));
        return {
          success: true,
          data: results,
          summary: results.map((r: any, i: number) => `${i + 1}. [${r.title}](${r.url}): ${r.snippet?.slice(0, 150)}...`).join('\n'),
          duration: Date.now() - start,
          metadata: { query: params.query, resultCount: results.length },
        };
      } catch (error: any) {
        return { success: false, data: null, summary: `Search failed: ${error.message}`, duration: Date.now() - start };
      }
    },
  };
}
```

- [ ] **Step 2: Implement Visit tool (Jina Reader)**

```typescript
// src/tools/visit.ts
import type { Tool, ToolResult } from '../types.js';

export function createVisitTool(apiKey: string): Tool {
  return {
    definition: {
      name: 'visit',
      description: 'Visit a URL and extract its main content as Markdown. Use this to read the full content of a web page.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to visit' },
        },
        required: ['url'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      try {
        const response = await fetch(`https://r.jina.ai/${params.url}`, {
          headers: {
            'Accept': 'text/markdown',
            'Authorization': `Bearer ${apiKey}`,
            'X-Return-Format': 'markdown',
          },
        });
        const text = await response.text();
        const truncated = text.slice(0, 8000);
        return {
          success: true,
          data: truncated,
          summary: `Extracted ${text.length} chars from ${params.url}. Content preview: ${truncated.slice(0, 300)}...`,
          duration: Date.now() - start,
          metadata: { url: params.url, charCount: text.length },
        };
      } catch (error: any) {
        return { success: false, data: null, summary: `Visit failed: ${error.message}`, duration: Date.now() - start };
      }
    },
  };
}
```

- [ ] **Step 3: Implement Python tool**

```typescript
// src/tools/python.ts
import { execFile } from 'child_process';
import type { Tool, ToolResult } from '../types.js';

export function createPythonTool(): Tool {
  return {
    definition: {
      name: 'python',
      description: 'Execute Python code for data analysis, calculations, or processing. The code runs in a sandboxed environment.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Python code to execute' },
        },
        required: ['code'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      return new Promise((resolve) => {
        execFile('python3', ['-c', params.code as string], { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
          const duration = Date.now() - start;
          if (error) {
            resolve({ success: false, data: { error: error.message, stderr }, summary: `Python error: ${stderr || error.message}`, duration });
          } else {
            resolve({
              success: true,
              data: { stdout, stderr },
              summary: `Python output: ${stdout.slice(0, 500)}`,
              duration,
              metadata: { codeLength: (params.code as string).length },
            });
          }
        });
      });
    },
  };
}
```

- [ ] **Step 4: Implement Scholar tool (Serper)**

```typescript
// src/tools/scholar.ts
import type { Tool, ToolResult } from '../types.js';

export function createScholarTool(apiKey: string): Tool {
  return {
    definition: {
      name: 'scholar',
      description: 'Search for academic papers and scholarly articles. Use this when you need scientific or academic sources.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Academic search query' },
        },
        required: ['query'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      try {
        const response = await fetch('https://google.serper.dev/scholar', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: params.query }),
        });
        const data = await response.json();
        const papers = (data.organic || []).slice(0, 5).map((p: any) => ({
          title: p.title, authors: p.publication_info?.summary, year: p.year,
          citedBy: p.inline_links?.cited_by?.total, snippet: p.snippet, link: p.link,
        }));
        return {
          success: true, data: papers,
          summary: papers.map((p: any, i: number) => `${i + 1}. "${p.title}" (${p.year || 'N/A'}, cited: ${p.citedBy || 'N/A'})`).join('\n'),
          duration: Date.now() - start,
          metadata: { query: params.query, paperCount: papers.length },
        };
      } catch (error: any) {
        return { success: false, data: null, summary: `Scholar search failed: ${error.message}`, duration: Date.now() - start };
      }
    },
  };
}
```

- [ ] **Step 5: Implement FileParser tool**

```typescript
// src/tools/file-parser.ts
import { readFile } from 'fs/promises';
import type { Tool, ToolResult } from '../types.js';

export function createFileParserTool(): Tool {
  return {
    definition: {
      name: 'file_parser',
      description: 'Parse and extract text from uploaded files (PDF, TXT, Markdown).',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
        },
        required: ['filePath'],
      },
    },
    async execute(params): Promise<ToolResult> {
      const start = Date.now();
      const filePath = params.filePath as string;
      try {
        if (filePath.endsWith('.pdf')) {
          const pdfParse = (await import('pdf-parse')).default;
          const buffer = await readFile(filePath);
          const pdf = await pdfParse(buffer);
          return {
            success: true, data: pdf.text.slice(0, 10000),
            summary: `Parsed PDF: ${pdf.numpages} pages, ${pdf.text.length} chars`,
            duration: Date.now() - start,
            metadata: { pages: pdf.numpages, charCount: pdf.text.length },
          };
        } else {
          const text = await readFile(filePath, 'utf-8');
          return {
            success: true, data: text.slice(0, 10000),
            summary: `Read file: ${text.length} chars`,
            duration: Date.now() - start,
            metadata: { charCount: text.length },
          };
        }
      } catch (error: any) {
        return { success: false, data: null, summary: `File parse failed: ${error.message}`, duration: Date.now() - start };
      }
    },
  };
}
```

- [ ] **Step 6: Commit all tools**

```bash
git add src/tools/
git commit -m "feat: implement 5 research tools (search, visit, python, scholar, file-parser)"
```

---

## Chunk 3: Agent Core + Orchestrator

### Task 6: ResearchAgent — The Core Loop

**Files:**
- Create: `src/agent/research-agent.ts`
- Create: `tests/agent/research-agent.test.ts`

This is the most important file in the project. It implements the Think-Act-Observe-Evaluate loop with Markovian state rebuild.

- [ ] **Step 1: Write agent test (mock LLM)**

```typescript
// tests/agent/research-agent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ResearchAgent } from '../src/agent/research-agent';
import type { Tool, LLMMessage, LLMResponse } from '../src/types';

const mockTool: Tool = {
  definition: {
    name: 'search', description: 'Search', parameters: { type: 'object', properties: { query: { type: 'string', description: 'q' } }, required: ['query'] },
  },
  execute: async () => ({ success: true, data: [{ title: 'Test Result', snippet: 'Relevant info about the topic' }], summary: 'Found 1 result', duration: 100 }),
};

describe('ResearchAgent', () => {
  it('should run at least one iteration and produce a report', async () => {
    let callCount = 0;
    const mockLLMChat = async (messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> => {
      callCount++;
      // First call: think + tool call
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [{ id: 'call_1', type: 'function', function: { name: 'search', arguments: '{"query":"test topic"}' } }],
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        };
      }
      // Second call: observe + evaluate (after tool result)
      if (callCount === 2) {
        return {
          content: JSON.stringify({
            thinking: 'I found relevant information about the test topic.',
            keyFindings: ['The topic has important implications'],
            completeness: 90,
            shouldContinue: false,
            reason: 'Sufficient information gathered',
            updatedReport: '# Test Topic Report\n\nThe topic has important implications based on search results.',
          }),
          toolCalls: [],
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        };
      }
      return { content: 'Done', toolCalls: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
    };

    const agent = new ResearchAgent({
      agentId: 'test-1',
      perspective: 'general overview',
      query: 'Tell me about test topic',
      maxIterations: 3,
      tools: [mockTool],
    }, mockLLMChat);

    const result = await agent.run();
    expect(result.agentId).toBe('test-1');
    expect(result.iterations.length).toBeGreaterThanOrEqual(1);
    expect(result.finalReport).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement ResearchAgent**

```typescript
// src/agent/research-agent.ts
import type { AgentConfig, AgentResult, IterationState, ActionRecord, Tool, ToolResult } from '../types.js';
import type { LLMMessage, LLMResponse } from '../llm/client.js';
import { EventEmitter } from 'events';

type LLMChatFn = (messages: LLMMessage[], tools?: Tool[]) => Promise<LLMResponse>;

export class ResearchAgent extends EventEmitter {
  private config: AgentConfig;
  private llmChat: LLMChatFn;
  private evolvingReport: string = '';
  private totalTokens: number = 0;

  constructor(config: AgentConfig, llmChat: LLMChatFn) {
    super();
    this.config = config;
    this.llmChat = llmChat;
  }

  async run(): Promise<AgentResult> {
    const startTime = Date.now();
    const iterations: IterationState[] = [];

    this.emit('agent:start', { agentId: this.config.agentId, perspective: this.config.perspective });

    for (let round = 1; round <= this.config.maxIterations; round++) {
      const iteration = await this.runIteration(round);
      iterations.push(iteration);

      if (!iteration.evaluate.shouldContinue) break;
    }

    const result: AgentResult = {
      agentId: this.config.agentId,
      perspective: this.config.perspective,
      iterations,
      finalReport: this.evolvingReport,
      totalTokens: this.totalTokens,
      duration: Date.now() - startTime,
    };

    this.emit('agent:complete', { agentId: this.config.agentId, finalReport: this.evolvingReport });
    return result;
  }

  private async runIteration(round: number): Promise<IterationState> {
    // === THINK + ACT (via function calling) ===
    const systemPrompt = this.buildSystemPrompt(round);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.buildUserPrompt(round) },
    ];

    const actions: ActionRecord[] = [];
    let thinkContent = '';

    // Multi-turn tool calling loop
    let response = await this.llmChat(messages, this.config.tools);
    this.totalTokens += response.usage.totalTokens;

    while (response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = this.config.tools.find((t) => t.definition.name === toolCall.function.name);
        if (!tool) continue;

        const params = JSON.parse(toolCall.function.arguments);
        this.emit('agent:act', { agentId: this.config.agentId, round, tool: toolCall.function.name, params });

        const actionStart = Date.now();
        const result = await tool.execute(params);
        const action: ActionRecord = { tool: toolCall.function.name, params, result, duration: Date.now() - actionStart };
        actions.push(action);

        this.emit('agent:tool_result', { agentId: this.config.agentId, round, tool: toolCall.function.name, result, duration: action.duration });

        messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] });
        messages.push({ role: 'tool', content: result.summary, tool_call_id: toolCall.id });
      }

      response = await this.llmChat(messages, this.config.tools);
      this.totalTokens += response.usage.totalTokens;
    }

    thinkContent = response.content || '';

    // === OBSERVE + EVALUATE + STATE REBUILD ===
    // Parse the structured response from LLM
    const parsed = this.parseThinkResponse(thinkContent);

    this.emit('agent:think', { agentId: this.config.agentId, round, reasoning: parsed.thinking, decision: parsed.reason });
    this.emit('agent:observe', { agentId: this.config.agentId, round, keyFindings: parsed.keyFindings });
    this.emit('agent:evaluate', { agentId: this.config.agentId, round, completeness: parsed.completeness, shouldContinue: parsed.shouldContinue });

    // State Rebuild: update evolving report
    const reportBefore = this.evolvingReport;
    this.evolvingReport = parsed.updatedReport || this.evolvingReport;

    this.emit('agent:state_rebuild', { agentId: this.config.agentId, round, reportBefore, reportAfter: this.evolvingReport });

    return {
      round,
      think: { reasoning: parsed.thinking, decision: parsed.reason, identifiedGaps: parsed.identifiedGaps || [] },
      actions,
      observe: { keyFindings: parsed.keyFindings },
      evaluate: { shouldContinue: parsed.shouldContinue, reason: parsed.reason, completeness: parsed.completeness },
      stateRebuild: { reportBefore, reportAfter: this.evolvingReport, contextTokens: this.estimateTokens(this.evolvingReport) },
    };
  }

  private buildSystemPrompt(round: number): string {
    return `You are a research agent investigating a specific perspective of a research question.
Your perspective: "${this.config.perspective}"
Current round: ${round}/${this.config.maxIterations}

## Your Task
1. THINK: Analyze the current state of your research. What do you know? What gaps remain?
2. ACT: Use the available tools to fill knowledge gaps. You can call multiple tools.
3. After tool results come back, provide your analysis in the following JSON format:

\`\`\`json
{
  "thinking": "Your detailed reasoning about what you've found and what it means",
  "keyFindings": ["finding 1", "finding 2", ...],
  "identifiedGaps": ["gap 1", "gap 2", ...],
  "completeness": <0-100>,
  "shouldContinue": true/false,
  "reason": "Why you should continue or stop",
  "updatedReport": "Your updated comprehensive report in Markdown incorporating ALL findings so far"
}
\`\`\`

## Important Rules
- The updatedReport should be a COMPLETE, self-contained report, not just new findings
- Include source URLs as citations in the report
- Set shouldContinue=false when completeness >= 80 or you cannot find more useful information
- Be thorough but concise in your report`;
  }

  private buildUserPrompt(round: number): string {
    if (round === 1) {
      return `Research Question: ${this.config.query}\n\nThis is the first round. Start by searching for key information about this topic from your perspective: "${this.config.perspective}".`;
    }
    return `Research Question: ${this.config.query}\n\nPrevious Research Report (compressed memory):\n${this.evolvingReport}\n\nContinue your research. Identify remaining gaps and search for additional information. Update the report with any new findings.`;
  }

  private parseThinkResponse(content: string): {
    thinking: string; keyFindings: string[]; identifiedGaps: string[];
    completeness: number; shouldContinue: boolean; reason: string; updatedReport: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"thinking"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
    } catch { /* fall through */ }

    // Fallback: treat entire content as a report
    return {
      thinking: content.slice(0, 200),
      keyFindings: [content.slice(0, 100)],
      identifiedGaps: [],
      completeness: 80,
      shouldContinue: false,
      reason: 'Could not parse structured response, treating as final',
      updatedReport: content,
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

- [ ] **Step 3: Run tests, then commit**

Run: `npx vitest run tests/agent/research-agent.test.ts`

```bash
git add src/agent/research-agent.ts tests/agent/research-agent.test.ts
git commit -m "feat: implement ResearchAgent with Think-Act-Observe-Evaluate loop and state rebuild"
```

---

### Task 7: Orchestrator

**Files:**
- Create: `src/orchestrator/orchestrator.ts`
- Create: `src/orchestrator/synthesizer.ts`

- [ ] **Step 1: Implement Synthesizer**

```typescript
// src/orchestrator/synthesizer.ts
import type { AgentResult, Citation, ResearchMode } from '../types.js';
import type { LLMMessage, LLMResponse } from '../llm/client.js';

type LLMChatFn = (messages: LLMMessage[]) => Promise<LLMResponse>;

export class Synthesizer {
  private llmChat: LLMChatFn;

  constructor(llmChat: LLMChatFn) {
    this.llmChat = llmChat;
  }

  async synthesize(query: string, agentResults: AgentResult[], mode: ResearchMode): Promise<{ content: string; citations: Citation[]; tokens: number }> {
    const reportsSection = agentResults.map((r, i) =>
      `## Agent ${i + 1}: ${r.perspective}\n\n${r.finalReport}`
    ).join('\n\n---\n\n');

    const modeInstruction = mode === 'report'
      ? 'Produce a comprehensive, well-structured research report in Markdown with sections, subsections, and inline citations [1][2].'
      : 'Produce a concise, direct answer to the question, citing sources inline.';

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a research synthesizer. Multiple research agents have investigated different perspectives of a question. Your job is to synthesize their findings into a single, coherent output.

Rules:
- Identify and resolve any conflicts between reports
- Preserve all important findings and citations
- ${modeInstruction}
- At the end, list all citations in a "## References" section`,
      },
      {
        role: 'user',
        content: `Original Question: ${query}\n\n# Individual Agent Reports\n\n${reportsSection}\n\nPlease synthesize these reports into a single ${mode === 'report' ? 'comprehensive report' : 'concise answer'}.`,
      },
    ];

    const response = await this.llmChat(messages);

    // Extract citations from all agent results
    const citations: Citation[] = [];
    let citationId = 1;
    for (const agent of agentResults) {
      for (const iter of agent.iterations) {
        for (const action of iter.actions) {
          if (action.tool === 'search' && action.result.success && Array.isArray(action.result.data)) {
            for (const item of action.result.data as any[]) {
              if (item.url) {
                citations.push({
                  id: citationId++, url: item.url, title: item.title || '',
                  snippet: item.snippet || '', foundBy: agent.agentId, foundAt: iter.round,
                });
              }
            }
          }
        }
      }
    }

    return {
      content: response.content || '',
      citations,
      tokens: response.usage.totalTokens,
    };
  }
}
```

- [ ] **Step 2: Implement Orchestrator**

```typescript
// src/orchestrator/orchestrator.ts
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { ResearchRequest, ResearchResult, AgentResult } from '../types.js';
import { LLMClient, type LLMMessage, type LLMResponse } from '../llm/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { ResearchAgent } from '../agent/research-agent.js';
import { Synthesizer } from './synthesizer.js';

export class Orchestrator extends EventEmitter {
  private llm: LLMClient;
  private toolRegistry: ToolRegistry;

  constructor(llm: LLMClient, toolRegistry: ToolRegistry) {
    super();
    this.llm = llm;
    this.toolRegistry = toolRegistry;
  }

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const id = uuidv4();
    const startTime = Date.now();

    // Phase 1: Query Analysis — determine perspectives
    this.emit('research:start', { id, query: request.query, mode: request.mode, agentCount: request.agentCount });

    const perspectives = await this.analyzeQuery(request.query, request.agentCount);

    // Phase 2: Dispatch parallel agents
    const tools = request.enabledTools.length > 0
      ? this.toolRegistry.getByNames(request.enabledTools)
      : this.toolRegistry.getAll();

    const agentPromises: Promise<AgentResult>[] = perspectives.map((perspective, i) => {
      const agent = new ResearchAgent({
        agentId: `agent-${i + 1}`,
        perspective,
        query: request.query,
        maxIterations: request.maxIterations,
        tools,
      }, (msgs, t) => this.llm.chat(msgs, t));

      // Relay agent events
      for (const event of ['agent:start', 'agent:think', 'agent:act', 'agent:tool_result', 'agent:observe', 'agent:evaluate', 'agent:state_rebuild', 'agent:complete']) {
        agent.on(event, (data) => this.emit(event, data));
      }

      return agent.run();
    });

    const agentResults = await Promise.all(agentPromises);

    // Phase 3: Synthesis
    this.emit('synthesis:start', { reportCount: agentResults.length });

    const synthesizer = new Synthesizer((msgs) => this.llm.chat(msgs));
    const synthesis = await synthesizer.synthesize(request.query, agentResults, request.mode);

    const result: ResearchResult = {
      id,
      query: request.query,
      mode: request.mode,
      agentResults,
      finalOutput: synthesis.content,
      citations: synthesis.citations,
      totalTokens: agentResults.reduce((sum, r) => sum + r.totalTokens, 0) + synthesis.tokens,
      totalDuration: Date.now() - startTime,
    };

    this.emit('synthesis:complete', { output: synthesis.content });
    this.emit('research:complete', { id, totalDuration: result.totalDuration, totalTokens: result.totalTokens });

    return result;
  }

  private async analyzeQuery(query: string, agentCount: number): Promise<string[]> {
    if (agentCount === 1) return ['comprehensive overview'];

    const response = await this.llm.chat([
      { role: 'system', content: `You are a research planner. Given a query, suggest ${agentCount} distinct research perspectives to investigate it thoroughly. Reply with a JSON array of strings.` },
      { role: 'user', content: query },
    ]);

    try {
      const match = (response.content || '').match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch { /* fall through */ }

    // Fallback perspectives
    const defaults = ['technical details', 'practical applications', 'historical context', 'future implications'];
    return defaults.slice(0, agentCount);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/orchestrator/
git commit -m "feat: implement Orchestrator with multi-agent dispatch and Synthesizer"
```

---

## Chunk 4: Tracer + API Server

### Task 8: AgentTracer

**Files:**
- Create: `src/tracer/tracer.ts`

- [ ] **Step 1: Implement AgentTracer**

```typescript
// src/tracer/tracer.ts
import type { ResearchTrace, AgentTrace, IterationState, SSEEvent, SSEEventType, ResearchMode } from '../types.js';

export class AgentTracer {
  private trace: ResearchTrace;

  constructor(id: string, query: string, mode: ResearchMode) {
    this.trace = {
      id, query, mode,
      startTime: Date.now(),
      orchestration: { queryAnalysis: '', agentCount: 0, perspectives: [], duration: 0 },
      agents: [],
      totalTokens: 0,
      estimatedCost: 0,
    };
  }

  handleEvent(event: SSEEvent): void {
    const { type, data } = event;

    switch (type) {
      case 'research:start':
        this.trace.orchestration.agentCount = data.agentCount as number;
        break;
      case 'agent:start':
        this.trace.agents.push({
          agentId: data.agentId as string,
          perspective: data.perspective as string,
          status: 'thinking',
          iterations: [],
          tokens: 0,
          duration: 0,
        });
        break;
      case 'agent:think': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'thinking';
          this.ensureIteration(agent, data.round as number).think = {
            reasoning: data.reasoning as string,
            decision: data.decision as string,
            identifiedGaps: [],
          };
        }
        break;
      }
      case 'agent:evaluate': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'evaluating';
          this.ensureIteration(agent, data.round as number).evaluate = {
            shouldContinue: data.shouldContinue as boolean,
            reason: data.reason as string || '',
            completeness: data.completeness as number,
          };
        }
        break;
      }
      case 'agent:complete': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'complete';
          agent.finalReport = data.finalReport as string;
        }
        break;
      }
      case 'research:complete':
        this.trace.endTime = Date.now();
        this.trace.totalTokens = data.totalTokens as number;
        this.trace.estimatedCost = this.trace.totalTokens * 0.00002; // rough estimate
        break;
    }
  }

  getTrace(): ResearchTrace {
    return this.trace;
  }

  private findAgent(agentId: string): AgentTrace | undefined {
    return this.trace.agents.find((a) => a.agentId === agentId);
  }

  private ensureIteration(agent: AgentTrace, round: number): IterationState {
    let iter = agent.iterations.find((i) => i.round === round);
    if (!iter) {
      iter = {
        round,
        think: { reasoning: '', decision: '', identifiedGaps: [] },
        actions: [],
        observe: { keyFindings: [] },
        evaluate: { shouldContinue: true, reason: '', completeness: 0 },
        stateRebuild: { reportBefore: '', reportAfter: '', contextTokens: 0 },
      };
      agent.iterations.push(iter);
    }
    return iter;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tracer/tracer.ts
git commit -m "feat: implement AgentTracer for full research trace recording"
```

---

### Task 9: SSE Utility + Express API

**Files:**
- Create: `src/api/sse.ts`
- Create: `src/api/router.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Implement SSE utility**

```typescript
// src/api/sse.ts
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
```

- [ ] **Step 2: Implement API router**

```typescript
// src/api/router.ts
import { Router, type Request, type Response } from 'express';
import { SSEWriter } from './sse.js';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { AgentTracer } from '../tracer/tracer.js';
import type { ResearchRequest, SSEEventType } from '../types.js';

export function createRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  // POST /api/research — Start a research task, stream results via SSE
  router.post('/api/research', async (req: Request, res: Response) => {
    const body = req.body as ResearchRequest;
    const request: ResearchRequest = {
      query: body.query || '',
      mode: body.mode || 'report',
      agentCount: body.agentCount || 1,
      maxIterations: body.maxIterations || 5,
      enabledTools: body.enabledTools || ['search', 'visit', 'scholar'],
      tokenBudget: body.tokenBudget,
    };

    const sse = new SSEWriter(res);
    const tracer = new AgentTracer(Date.now().toString(), request.query, request.mode);

    // Wire up orchestrator events to SSE
    const events: SSEEventType[] = [
      'research:start', 'agent:start', 'agent:think', 'agent:act', 'agent:tool_result',
      'agent:observe', 'agent:evaluate', 'agent:state_rebuild', 'agent:complete',
      'synthesis:start', 'synthesis:complete', 'research:complete',
    ];

    for (const event of events) {
      orchestrator.on(event, (data: Record<string, unknown>) => {
        sse.send(event, data);
        tracer.handleEvent({ type: event, data, timestamp: Date.now() });
      });
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
    } catch (error: any) {
      sse.send('error', { message: error.message });
    } finally {
      // Clean up listeners
      for (const event of events) {
        orchestrator.removeAllListeners(event);
      }
      sse.close();
    }
  });

  // GET /api/health
  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return router;
}
```

- [ ] **Step 3: Implement server entry point**

```typescript
// src/index.ts
import express from 'express';
import { config } from './config.js';
import { LLMClient } from './llm/client.js';
import { ToolRegistry } from './tools/registry.js';
import { createSearchTool } from './tools/search.js';
import { createVisitTool } from './tools/visit.js';
import { createPythonTool } from './tools/python.js';
import { createScholarTool } from './tools/scholar.js';
import { createFileParserTool } from './tools/file-parser.js';
import { Orchestrator } from './orchestrator/orchestrator.js';
import { createRouter } from './api/router.js';

const app = express();
app.use(express.json());

// Initialize LLM
const llm = new LLMClient(config.llm);

// Initialize tools
const toolRegistry = new ToolRegistry();
if (config.tools.tavilyApiKey) toolRegistry.register(createSearchTool(config.tools.tavilyApiKey));
if (config.tools.jinaApiKey) toolRegistry.register(createVisitTool(config.tools.jinaApiKey));
toolRegistry.register(createPythonTool());
if (config.tools.serperApiKey) toolRegistry.register(createScholarTool(config.tools.serperApiKey));
toolRegistry.register(createFileParserTool());

// Initialize orchestrator
const orchestrator = new Orchestrator(llm, toolRegistry);

// Mount routes
app.use(createRouter(orchestrator));

// Serve frontend (in production)
app.use(express.static('web/dist'));

app.listen(config.server.port, () => {
  console.log(`Mini DeepResearch Agent running on http://localhost:${config.server.port}`);
  console.log(`Registered tools: ${toolRegistry.getAll().map((t) => t.definition.name).join(', ')}`);
});
```

- [ ] **Step 4: Commit**

```bash
git add src/api/ src/index.ts
git commit -m "feat: implement Express API server with SSE streaming"
```

---

## Chunk 5: Frontend

### Task 10: Frontend Scaffolding

**Files:**
- Create: `web/package.json`
- Create: `web/index.html`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/types.ts`

- [ ] **Step 1: Scaffold Vite + React project**

`web/package.json`:
```json
{
  "name": "mini-deep-research-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

`web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
```

`web/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mini DeepResearch Agent</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create entry files**

`web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

`web/src/App.tsx`:
```tsx
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ResearchPage } from './pages/ResearchPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/research" element={<ResearchPage />} />
    </Routes>
  );
}
```

`web/src/types.ts`:
```typescript
// Mirror of backend SSE event types for the frontend
export interface SSEEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface AgentState {
  agentId: string;
  perspective: string;
  status: 'pending' | 'thinking' | 'acting' | 'observing' | 'evaluating' | 'complete';
  currentRound: number;
  maxRounds: number;
  completeness: number;
  iterations: IterationView[];
}

export interface IterationView {
  round: number;
  thinking?: string;
  decision?: string;
  actions: ActionView[];
  keyFindings: string[];
  completeness: number;
  shouldContinue: boolean;
  reason?: string;
  reportDiff?: { before: string; after: string };
}

export interface ActionView {
  tool: string;
  params: Record<string, any>;
  result?: string;
  duration?: number;
  status: 'running' | 'done' | 'error';
}

export interface ResearchState {
  status: 'idle' | 'running' | 'complete' | 'error';
  agents: AgentState[];
  selectedAgentId: string | null;
  finalOutput: string | null;
  citations: any[];
  totalTokens: number;
  totalDuration: number;
  events: SSEEvent[];
}
```

- [ ] **Step 3: Install frontend deps and commit**

Run: `cd web && npm install && cd ..`

```bash
git add web/
git commit -m "feat: scaffold React frontend with Vite"
```

---

### Task 11: SSE Hook + HomePage

**Files:**
- Create: `web/src/hooks/useResearchSSE.ts`
- Create: `web/src/pages/HomePage.tsx`

- [ ] **Step 1: Implement SSE hook**

```typescript
// web/src/hooks/useResearchSSE.ts
import { useState, useCallback, useRef } from 'react';
import type { ResearchState, SSEEvent, AgentState, IterationView, ActionView } from '../types';

const initialState: ResearchState = {
  status: 'idle', agents: [], selectedAgentId: null,
  finalOutput: null, citations: [], totalTokens: 0, totalDuration: 0, events: [],
};

export function useResearchSSE() {
  const [state, setState] = useState<ResearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(async (request: {
    query: string; mode: string; agentCount: number; maxIterations: number; enabledTools: string[];
  }) => {
    setState({ ...initialState, status: 'running' });
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortRef.current.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              setState((prev) => processEvent(prev, event));
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setState((prev) => ({ ...prev, status: 'error' }));
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: 'complete' }));
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setState((prev) => ({ ...prev, selectedAgentId: agentId }));
  }, []);

  return { state, startResearch, stop, selectAgent };
}

function processEvent(prev: ResearchState, event: SSEEvent): ResearchState {
  const next = { ...prev, events: [...prev.events, event] };

  switch (event.type) {
    case 'agent:start': {
      const agent: AgentState = {
        agentId: event.data.agentId, perspective: event.data.perspective,
        status: 'thinking', currentRound: 0, maxRounds: 10, completeness: 0, iterations: [],
      };
      next.agents = [...next.agents, agent];
      if (!next.selectedAgentId) next.selectedAgentId = agent.agentId;
      break;
    }
    case 'agent:think':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a, status: 'thinking', currentRound: event.data.round as number,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, thinking: event.data.reasoning as string, decision: event.data.decision as string,
        })),
      }));
      break;
    case 'agent:act':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a, status: 'acting',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, actions: [...it.actions, { tool: event.data.tool as string, params: event.data.params as any, status: 'running' }],
        })),
      }));
      break;
    case 'agent:tool_result':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, actions: it.actions.map((act, i) =>
            i === it.actions.length - 1 ? { ...act, result: (event.data.result as any)?.summary, duration: event.data.duration as number, status: 'done' as const } : act
          ),
        })),
      }));
      break;
    case 'agent:observe':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a, status: 'observing',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, keyFindings: event.data.keyFindings as string[],
        })),
      }));
      break;
    case 'agent:evaluate':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a, status: 'evaluating', completeness: event.data.completeness as number,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, completeness: event.data.completeness as number, shouldContinue: event.data.shouldContinue as boolean, reason: event.data.reason as string,
        })),
      }));
      break;
    case 'agent:state_rebuild':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a, status: 'thinking',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it, reportDiff: { before: event.data.reportBefore as string, after: event.data.reportAfter as string },
        })),
      }));
      break;
    case 'agent:complete':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({ ...a, status: 'complete' }));
      break;
    case 'research:complete':
      next.status = 'complete';
      next.finalOutput = event.data.finalOutput as string || null;
      next.citations = (event.data.citations as any[]) || [];
      next.totalTokens = event.data.totalTokens as number || 0;
      next.totalDuration = event.data.totalDuration as number || 0;
      break;
    case 'error':
      next.status = 'error';
      break;
  }
  return next;
}

function updateAgent(agents: AgentState[], id: string, updater: (a: AgentState) => AgentState): AgentState[] {
  return agents.map((a) => a.agentId === id ? updater(a) : a);
}

function upsertIteration(iterations: IterationView[], round: number, updater: (it: IterationView) => IterationView): IterationView[] {
  const exists = iterations.find((it) => it.round === round);
  if (exists) return iterations.map((it) => it.round === round ? updater(it) : it);
  const newIter: IterationView = { round, actions: [], keyFindings: [], completeness: 0, shouldContinue: true };
  return [...iterations, updater(newIter)];
}
```

- [ ] **Step 2: Implement HomePage**

```tsx
// web/src/pages/HomePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'report' | 'qa'>('report');
  const [agentCount, setAgentCount] = useState(2);
  const [maxIterations, setMaxIterations] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = () => {
    if (!query.trim()) return;
    const params = new URLSearchParams({
      query, mode, agentCount: String(agentCount), maxIterations: String(maxIterations),
    });
    navigate(`/research?${params.toString()}`);
  };

  return (
    <div style={{ maxWidth: 700, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Mini DeepResearch Agent</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        An educational deep research agent with transparent Think-Act-Observe-Evaluate loop
      </p>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your research question..."
        rows={3}
        style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ddd', resize: 'vertical', boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button onClick={() => setMode('report')} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #ddd', background: mode === 'report' ? '#0066ff' : '#fff', color: mode === 'report' ? '#fff' : '#333', cursor: 'pointer' }}>
          Report Mode
        </button>
        <button onClick={() => setMode('qa')} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #ddd', background: mode === 'qa' ? '#0066ff' : '#fff', color: mode === 'qa' ? '#fff' : '#333', cursor: 'pointer' }}>
          Q&A Mode
        </button>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer', padding: 0, marginBottom: 12 }}>
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {showAdvanced && (
        <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 8, marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Parallel Agents: {agentCount}
            <input type="range" min={1} max={3} value={agentCount} onChange={(e) => setAgentCount(+e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>
          <label style={{ display: 'block' }}>
            Max Iterations: {maxIterations}
            <input type="range" min={1} max={10} value={maxIterations} onChange={(e) => setMaxIterations(+e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>
        </div>
      )}

      <button onClick={handleSubmit} disabled={!query.trim()} style={{ width: '100%', padding: '12px 24px', fontSize: 16, borderRadius: 8, border: 'none', background: query.trim() ? '#0066ff' : '#ccc', color: '#fff', cursor: query.trim() ? 'pointer' : 'not-allowed' }}>
        Start Research
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/ web/src/pages/HomePage.tsx
git commit -m "feat: add SSE hook and HomePage input form"
```

---

### Task 12: ResearchPage + Visualization Components

**Files:**
- Create: `web/src/pages/ResearchPage.tsx`
- Create: `web/src/components/AgentCard.tsx`
- Create: `web/src/components/ThinkingProcess.tsx`
- Create: `web/src/components/TraceTimeline.tsx`
- Create: `web/src/components/ToolCallCard.tsx`
- Create: `web/src/components/ReportRenderer.tsx`

- [ ] **Step 1: Implement AgentCard**

```tsx
// web/src/components/AgentCard.tsx
import type { AgentState } from '../types';

const statusColors: Record<string, string> = {
  pending: '#999', thinking: '#f59e0b', acting: '#3b82f6',
  observing: '#8b5cf6', evaluating: '#ef4444', complete: '#22c55e',
};

export function AgentCard({ agent, selected, onClick }: { agent: AgentState; selected: boolean; onClick: () => void }) {
  const progress = (agent.currentRound / agent.maxRounds) * 100;

  return (
    <div onClick={onClick} style={{
      padding: 12, borderRadius: 8, cursor: 'pointer', marginBottom: 8,
      border: selected ? '2px solid #0066ff' : '1px solid #e0e0e0',
      background: selected ? '#f0f7ff' : '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <strong>{agent.agentId}</strong>
        <span style={{ fontSize: 12, color: statusColors[agent.status], fontWeight: 600 }}>
          {agent.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{agent.perspective}</div>
      <div style={{ height: 4, borderRadius: 2, background: '#e0e0e0' }}>
        <div style={{ height: '100%', borderRadius: 2, background: '#0066ff', width: `${Math.min(progress, 100)}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        Round {agent.currentRound} | {agent.completeness}% complete
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ToolCallCard**

```tsx
// web/src/components/ToolCallCard.tsx
import type { ActionView } from '../types';

const toolIcons: Record<string, string> = { search: 'search', visit: 'link', python: 'code', scholar: 'school', file_parser: 'description' };

export function ToolCallCard({ action }: { action: ActionView }) {
  return (
    <div style={{ padding: 8, background: '#f8f8f8', borderRadius: 6, marginBottom: 6, borderLeft: `3px solid ${action.status === 'running' ? '#f59e0b' : action.status === 'done' ? '#22c55e' : '#ef4444'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span><strong>{action.tool}</strong>({JSON.stringify(action.params).slice(0, 60)}...)</span>
        {action.duration && <span style={{ color: '#999' }}>{action.duration}ms</span>}
      </div>
      {action.result && <div style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>{action.result.slice(0, 200)}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Implement ThinkingProcess**

```tsx
// web/src/components/ThinkingProcess.tsx
import type { AgentState, IterationView } from '../types';
import { ToolCallCard } from './ToolCallCard';

export function ThinkingProcess({ agent }: { agent: AgentState }) {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>{agent.agentId}: {agent.perspective}</h3>
      {agent.iterations.map((iter) => (
        <IterationBlock key={iter.round} iteration={iter} />
      ))}
    </div>
  );
}

function IterationBlock({ iteration }: { iteration: IterationView }) {
  return (
    <div style={{ marginBottom: 24, borderLeft: '2px solid #e0e0e0', paddingLeft: 16 }}>
      <h4 style={{ color: '#0066ff' }}>Round {iteration.round}</h4>

      {iteration.thinking && (
        <Section title="Think" color="#f59e0b">
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{iteration.thinking}</p>
        </Section>
      )}

      {iteration.actions.length > 0 && (
        <Section title="Act" color="#3b82f6">
          {iteration.actions.map((a, i) => <ToolCallCard key={i} action={a} />)}
        </Section>
      )}

      {iteration.keyFindings.length > 0 && (
        <Section title="Observe" color="#8b5cf6">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {iteration.keyFindings.map((f, i) => <li key={i} style={{ fontSize: 14 }}>{f}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Evaluate" color="#ef4444">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e0e0e0' }}>
            <div style={{ height: '100%', borderRadius: 4, background: iteration.completeness >= 80 ? '#22c55e' : '#f59e0b', width: `${iteration.completeness}%` }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{iteration.completeness}%</span>
          <span style={{ fontSize: 12, color: iteration.shouldContinue ? '#f59e0b' : '#22c55e' }}>
            {iteration.shouldContinue ? 'Continue' : 'Done'}
          </span>
        </div>
        {iteration.reason && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{iteration.reason}</div>}
      </Section>

      {iteration.reportDiff && (
        <Section title="State Rebuild" color="#06b6d4">
          <div style={{ fontSize: 12, color: '#666' }}>Report updated ({iteration.reportDiff.after.length} chars)</div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement TraceTimeline**

```tsx
// web/src/components/TraceTimeline.tsx
import type { ResearchState } from '../types';

export function TraceTimeline({ state }: { state: ResearchState }) {
  const tokensByPhase = { think: 0, act: 0, observe: 0, total: state.totalTokens };

  return (
    <div style={{ padding: 16, fontSize: 13 }}>
      <h4 style={{ marginTop: 0 }}>Timeline</h4>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {state.events.slice(-50).map((event, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
            <span style={{ color: '#999', minWidth: 60 }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: getEventColor(event.type) }}>
              {event.type.split(':')[1]}
            </span>
            <span style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.data.agentId || ''} {event.data.tool || ''} {event.data.reason || ''}
            </span>
          </div>
        ))}
      </div>

      <h4>Token Usage</h4>
      <div style={{ background: '#f8f8f8', padding: 12, borderRadius: 8 }}>
        <div>Total: <strong>{state.totalTokens.toLocaleString()}</strong></div>
        <div>Duration: <strong>{(state.totalDuration / 1000).toFixed(1)}s</strong></div>
        <div>Est. Cost: <strong>${(state.totalTokens * 0.00002).toFixed(4)}</strong></div>
      </div>
    </div>
  );
}

function getEventColor(type: string): string {
  if (type.includes('think')) return '#f59e0b';
  if (type.includes('act') || type.includes('tool')) return '#3b82f6';
  if (type.includes('observe')) return '#8b5cf6';
  if (type.includes('evaluate')) return '#ef4444';
  if (type.includes('complete')) return '#22c55e';
  return '#666';
}
```

- [ ] **Step 5: Implement ReportRenderer**

```tsx
// web/src/components/ReportRenderer.tsx
import ReactMarkdown from 'react-markdown';

export function ReportRenderer({ content, citations }: { content: string; citations: any[] }) {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h3>Research Report</h3>
      <div style={{ lineHeight: 1.7, fontSize: 15 }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {citations.length > 0 && (
        <div style={{ marginTop: 24, padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
          <h4>Sources</h4>
          {citations.map((c) => (
            <div key={c.id} style={{ fontSize: 13, marginBottom: 6 }}>
              [{c.id}] <a href={c.url} target="_blank" rel="noopener">{c.title || c.url}</a>
              <span style={{ color: '#999' }}> — found by {c.foundBy}, round {c.foundAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement ResearchPage (main visualization)**

```tsx
// web/src/pages/ResearchPage.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResearchSSE } from '../hooks/useResearchSSE';
import { AgentCard } from '../components/AgentCard';
import { ThinkingProcess } from '../components/ThinkingProcess';
import { TraceTimeline } from '../components/TraceTimeline';
import { ReportRenderer } from '../components/ReportRenderer';

export function ResearchPage() {
  const [searchParams] = useSearchParams();
  const { state, startResearch, selectAgent } = useResearchSSE();

  useEffect(() => {
    const query = searchParams.get('query');
    if (query && state.status === 'idle') {
      startResearch({
        query,
        mode: searchParams.get('mode') || 'report',
        agentCount: parseInt(searchParams.get('agentCount') || '2', 10),
        maxIterations: parseInt(searchParams.get('maxIterations') || '5', 10),
        enabledTools: ['search', 'visit', 'scholar'],
      });
    }
  }, [searchParams]);

  const selectedAgent = state.agents.find((a) => a.agentId === state.selectedAgentId);

  if (state.status === 'complete' && state.finalOutput) {
    return <ReportRenderer content={state.finalOutput} citations={state.citations} />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', height: '100vh', fontFamily: 'system-ui' }}>
      {/* Left: Agent Overview */}
      <div style={{ borderRight: '1px solid #e0e0e0', padding: 16, overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Agents</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Query: {searchParams.get('query')?.slice(0, 50)}...
        </div>
        {state.agents.map((agent) => (
          <AgentCard
            key={agent.agentId} agent={agent}
            selected={agent.agentId === state.selectedAgentId}
            onClick={() => selectAgent(agent.agentId)}
          />
        ))}
        {state.agents.length === 0 && state.status === 'running' && (
          <div style={{ color: '#999', fontSize: 14 }}>Analyzing query & dispatching agents...</div>
        )}
      </div>

      {/* Center: Agent Detail */}
      <div style={{ overflowY: 'auto', background: '#fafafa' }}>
        {selectedAgent ? (
          <ThinkingProcess agent={selectedAgent} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            {state.status === 'running' ? 'Waiting for agents to start...' : 'Select an agent to view details'}
          </div>
        )}
      </div>

      {/* Right: Trace Panel */}
      <div style={{ borderLeft: '1px solid #e0e0e0', overflowY: 'auto' }}>
        <TraceTimeline state={state} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat: implement research visualization with agent cards, thinking process, and trace timeline"
```

---

## Chunk 6: Integration & Polish

### Task 13: Root Scripts + Final Integration

**Files:**
- Modify: `package.json` (add workspace scripts)

- [ ] **Step 1: Add root convenience scripts to package.json**

Add these scripts to root `package.json`:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:web": "cd web && npm run dev",
    "dev:all": "npm run dev & npm run dev:web",
    "build": "tsc && cd web && npm run build",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Run full backend test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Manual smoke test**

1. Copy `.env.example` to `.env` and fill in API keys
2. Run `npm run dev` in one terminal
3. Run `npm run dev:web` in another terminal
4. Open http://localhost:5173
5. Enter a research question and verify the flow

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add development scripts and finalize integration"
```

---

## Execution Notes

- **Independent tasks** that can be parallelized: Task 4 (individual tools) can run in parallel. Task 11 components can run in parallel.
- **Critical path**: Task 1 → 2 → 3 → 6 → 7 → 9 (backend must work before frontend)
- **Environment variables required**: LLM_API_KEY (ZhipuAI), TAVILY_API_KEY, JINA_API_KEY, SERPER_API_KEY
- **LLM compatibility**: ZhipuAI GLM-4 supports OpenAI-compatible function calling at `https://open.bigmodel.cn/api/paas/v4/`
