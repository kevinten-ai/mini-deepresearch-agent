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
        const data = await response.json() as { results?: Array<{ title: string; url: string; content: string; score: number }> };
        const results = (data.results || []).map((r) => ({
          title: r.title, url: r.url, snippet: r.content, score: r.score,
        }));
        return {
          success: true,
          data: results,
          summary: results.map((r, i) => `${i + 1}. [${r.title}](${r.url}): ${r.snippet?.slice(0, 150)}...`).join('\n'),
          duration: Date.now() - start,
          metadata: { query: params.query, resultCount: results.length },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, data: null, summary: `Search failed: ${message}`, duration: Date.now() - start };
      }
    },
  };
}
