import type { AgentResult, Citation, ResearchMode } from '../types.js';
import type { LLMMessage, LLMResponse } from '../llm/client.js';

type LLMChatFn = (messages: LLMMessage[]) => Promise<LLMResponse>;

export class Synthesizer {
  private llmChat: LLMChatFn;

  constructor(llmChat: LLMChatFn) {
    this.llmChat = llmChat;
  }

  async synthesize(
    query: string,
    agentResults: AgentResult[],
    mode: ResearchMode,
  ): Promise<{ content: string; citations: Citation[]; tokens: number }> {
    const reportsSection = agentResults
      .map((r, i) => `## Agent ${i + 1}: ${r.perspective}\n\n${r.finalReport}`)
      .join('\n\n---\n\n');

    const modeInstruction =
      mode === 'report'
        ? 'Produce a comprehensive, well-structured research report in Markdown with sections, subsections, and inline citations [1][2].'
        : 'Produce a concise, direct answer to the question, citing sources inline.';

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a research synthesizer. Multiple research agents have investigated different perspectives of a question. Your job is to synthesize their findings into a single, coherent output.

Rules:
- Identify and resolve any conflicts between reports
- Preserve all important findings and citations
- ${modeInstruction}
- At the end, list all citations in a "## References" section

Visual Content Guidelines:
- Include Mermaid diagrams where they help illustrate the content. Use fenced code blocks with the "mermaid" language identifier. Good use cases:
  - Flowcharts for process explanations (graph TD or graph LR)
  - Mind maps for concept relationships (mindmap)
  - Timeline diagrams for chronological events (timeline)
  - Comparison/classification charts
  Example: \`\`\`mermaid
  graph LR
    A[Input] --> B[Process]
    B --> C[Output]
  \`\`\`
- For key concepts or sections that would benefit from an AI-generated illustration, add an image placeholder with this exact syntax: ![IMAGE:description of the illustration needed]
  - Use 2-4 image placeholders for important concepts
  - The description should be specific enough for an AI image generator
  - Example: ![IMAGE:a neural network architecture diagram showing layers of interconnected nodes with data flowing from input to output]`,
      },
      {
        role: 'user',
        content: `Original Question: ${query}\n\n# Individual Agent Reports\n\n${reportsSection}\n\nPlease synthesize these reports into a single ${mode === 'report' ? 'comprehensive report with Mermaid diagrams and image placeholders' : 'concise answer'}.`,
      },
    ];

    const response = await this.llmChat(messages);

    const citations: Citation[] = [];
    let citationId = 1;
    for (const agent of agentResults) {
      for (const iter of agent.iterations) {
        for (const action of iter.actions) {
          if (action.tool === 'search' && action.result.success && Array.isArray(action.result.data)) {
            for (const item of action.result.data as Array<{ url?: string; title?: string; snippet?: string }>) {
              if (item.url) {
                citations.push({
                  id: citationId++,
                  url: item.url,
                  title: item.title || '',
                  snippet: item.snippet || '',
                  foundBy: agent.agentId,
                  foundAt: iter.round,
                });
              }
            }
          }
        }
      }
    }

    return {
      content: response.content || '',
      citations,
      tokens: response.usage.totalTokens,
    };
  }
}
