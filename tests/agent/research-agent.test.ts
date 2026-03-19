import { describe, it, expect } from 'vitest';
import { ResearchAgent } from '../../src/agent/research-agent.js';
import type { Tool } from '../../src/types.js';
import type { LLMMessage, LLMResponse } from '../../src/llm/client.js';

const mockTool: Tool = {
  definition: {
    name: 'search',
    description: 'Search',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'q' } },
      required: ['query'],
    },
  },
  execute: async () => ({
    success: true,
    data: [{ title: 'Test Result', snippet: 'Relevant info about the topic' }],
    summary: 'Found 1 result about the topic',
    duration: 100,
  }),
};

describe('ResearchAgent', () => {
  it('should run at least one iteration and produce a report', async () => {
    let callCount = 0;
    const mockLLMChat = async (
      _messages: LLMMessage[],
      _tools?: Tool[],
    ): Promise<LLMResponse> => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              type: 'function' as const,
              function: { name: 'search', arguments: '{"query":"test topic"}' },
            },
          ],
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        };
      }
      return {
        content: JSON.stringify({
          thinking: 'Found relevant information about the test topic.',
          keyFindings: ['The topic has important implications'],
          identifiedGaps: [],
          completeness: 90,
          shouldContinue: false,
          reason: 'Sufficient information gathered',
          updatedReport:
            '# Test Topic Report\n\nThe topic has important implications.',
        }),
        toolCalls: [],
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };
    };

    const agent = new ResearchAgent(
      {
        agentId: 'test-1',
        perspective: 'general overview',
        query: 'Tell me about test topic',
        maxIterations: 3,
        tools: [mockTool],
      },
      mockLLMChat,
    );

    const result = await agent.run();
    expect(result.agentId).toBe('test-1');
    expect(result.iterations).toHaveLength(1);
    expect(result.finalReport).toContain('Test Topic Report');
    expect(result.totalTokens).toBe(450);
  });

  it('should emit events during execution', async () => {
    const events: string[] = [];
    const mockLLMChat = async (): Promise<LLMResponse> => ({
      content: JSON.stringify({
        thinking: 'Done',
        keyFindings: ['found'],
        completeness: 100,
        shouldContinue: false,
        reason: 'Done',
        updatedReport: 'Report',
      }),
      toolCalls: [],
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });

    const agent = new ResearchAgent(
      {
        agentId: 'test-2',
        perspective: 'test',
        query: 'test',
        maxIterations: 1,
        tools: [],
      },
      mockLLMChat,
    );

    agent.on('agent:start', () => events.push('start'));
    agent.on('agent:think', () => events.push('think'));
    agent.on('agent:complete', () => events.push('complete'));

    await agent.run();
    expect(events).toContain('start');
    expect(events).toContain('think');
    expect(events).toContain('complete');
  });
});
