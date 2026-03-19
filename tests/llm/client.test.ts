import { describe, it, expect } from 'vitest';
import { LLMClient } from '../../src/llm/client.js';

describe('LLMClient', () => {
  it('should format tool definitions for function calling', () => {
    const client = new LLMClient({ apiKey: 'test', baseURL: 'http://test', model: 'test' });
    const tools = [
      {
        definition: {
          name: 'search',
          description: 'Search the web',
          parameters: {
            type: 'object' as const,
            properties: { query: { type: 'string', description: 'Search query' } },
            required: ['query'],
          },
        },
        execute: async () => ({ success: true, data: [], summary: '', duration: 0 }),
      },
    ];
    const formatted = client.formatTools(tools);
    expect(formatted[0].type).toBe('function');
    expect(formatted[0].function.name).toBe('search');
    expect(formatted[0].function.description).toBe('Search the web');
  });
});
