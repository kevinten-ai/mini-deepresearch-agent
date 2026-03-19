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
- At the end, list all citations in a "## References" section`,
      },
      {
        role: 'user',
        content: `Original Question: ${query}\n\n# Individual Agent Reports\n\n${reportsSection}\n\nPlease synthesize these reports into a single ${mode === 'report' ? 'comprehensive report' : 'concise answer'}.`,
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
