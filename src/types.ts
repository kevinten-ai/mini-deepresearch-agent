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
export type AgentStatus =
  | 'pending'
  | 'thinking'
  | 'acting'
  | 'observing'
  | 'evaluating'
  | 'rebuilding'
  | 'complete'
  | 'error';

export interface AgentConfig {
  agentId: string;
  perspective: string;
  query: string;
  maxIterations: number;
  tools: Tool[];
}

export interface IterationState {
  round: number;
  think: {
    reasoning: string;
    decision: string;
    identifiedGaps: string[];
  };
  actions: ActionRecord[];
  observe: {
    keyFindings: string[];
  };
  evaluate: {
    shouldContinue: boolean;
    reason: string;
    completeness: number;
  };
  stateRebuild: {
    reportBefore: string;
    reportAfter: string;
    contextTokens: number;
  };
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
  foundBy: string;
  foundAt: number;
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
