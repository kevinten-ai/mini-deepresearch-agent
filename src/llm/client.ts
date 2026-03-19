import OpenAI from 'openai';
import type { Tool } from '../types.js';

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    this.model = config.model;
  }

  formatTools(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      },
    }));
  }

  async chat(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    };

    if (tools && tools.length > 0) {
      params.tools = this.formatTools(tools);
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls || [],
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }
}
