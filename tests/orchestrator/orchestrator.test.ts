import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/orchestrator/orchestrator.js';
import { LLMClient } from '../../src/llm/client.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('Orchestrator', () => {
  it('should be constructable with LLM client and tool registry', () => {
    const llm = new LLMClient({ apiKey: 'test', baseURL: 'http://test', model: 'test' });
    const registry = new ToolRegistry();
    const orchestrator = new Orchestrator(llm, registry);
    expect(orchestrator).toBeDefined();
    expect(orchestrator).toBeInstanceOf(Orchestrator);
  });
});
