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
        const data = await response.json() as {
          organic?: Array<{
            title: string;
            publication_info?: { summary: string };
            year?: string;
            inline_links?: { cited_by?: { total: number } };
            snippet: string;
            link: string;
          }>;
        };
        const papers = (data.organic || []).slice(0, 5).map((p) => ({
          title: p.title,
          authors: p.publication_info?.summary,
          year: p.year,
          citedBy: p.inline_links?.cited_by?.total,
          snippet: p.snippet,
          link: p.link,
        }));
        return {
          success: true,
          data: papers,
          summary: papers
            .map((p, i) => `${i + 1}. "${p.title}" (${p.year || 'N/A'}, cited: ${p.citedBy || 'N/A'})`)
            .join('\n'),
          duration: Date.now() - start,
          metadata: { query: params.query, paperCount: papers.length },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, data: null, summary: `Scholar search failed: ${message}`, duration: Date.now() - start };
      }
    },
  };
}
