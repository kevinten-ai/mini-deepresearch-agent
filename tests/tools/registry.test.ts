import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/tools/registry.js';
import type { Tool } from '../../src/types.js';

function mockTool(name: string): Tool {
  return {
    definition: {
      name,
      description: `${name} tool`,
      parameters: { type: 'object', properties: {}, required: [] },
    },
    execute: async () => ({ success: true, data: null, summary: 'done', duration: 0 }),
  };
}

describe('ToolRegistry', () => {
  it('should register and retrieve tools by name', () => {
    const registry = new ToolRegistry();
    const tool = mockTool('test');
    registry.register(tool);
    expect(registry.get('test')).toBe(tool);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('should filter tools by enabled list', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool('search'));
    registry.register(mockTool('visit'));
    registry.register(mockTool('python'));
    const filtered = registry.getByNames(['search', 'python']);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.definition.name)).toEqual(['search', 'python']);
  });

  it('should return undefined for unknown tool name', () => {
    const registry = new ToolRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });
});
