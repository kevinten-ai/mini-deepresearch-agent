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
