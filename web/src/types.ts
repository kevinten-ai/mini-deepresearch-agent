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
  /** Characters generated so far in current streaming LLM call */
  streamingChars: number;
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
  errorMessage: string | null;
  synthesisStatus: 'idle' | 'running' | 'complete';
  mediaStatus: 'idle' | 'running' | 'complete';
  mediaProgress: { index: number; total: number; description: string } | null;
  showReport: boolean;
}
