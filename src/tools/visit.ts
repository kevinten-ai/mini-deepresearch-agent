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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, data: null, summary: `Visit failed: ${message}`, duration: Date.now() - start };
      }
    },
  };
}
