import type { Tool } from '../types.js';

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  image?: OptionalProviderConfig;
  video?: OptionalProviderConfig;
}

interface OptionalProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export class LLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private imageProvider?: ProviderConfig;
  private videoProvider?: ProviderConfig;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    // Ensure baseURL ends without trailing slash
    this.baseURL = config.baseURL.replace(/\/+$/, '');
    this.model = config.model;
    this.imageProvider = this.normalizeOptionalProvider(config.image);
    this.videoProvider = this.normalizeOptionalProvider(config.video);
  }

  private normalizeOptionalProvider(config?: OptionalProviderConfig): ProviderConfig | undefined {
    if (!config?.apiKey || !config.baseURL || !config.model) return undefined;
    return {
      apiKey: config.apiKey,
      baseURL: config.baseURL.replace(/\/+$/, ''),
      model: config.model,
    };
  }

  hasImageGeneration(): boolean {
    return Boolean(this.imageProvider);
  }

  formatTools(tools: Tool[]): Array<{ type: 'function'; function: Record<string, unknown> }> {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      },
    }));
  }

  /** Generate an image using the optional configured image provider. Returns URL or null on failure. */
  async generateImage(prompt: string): Promise<string | null> {
    if (!this.imageProvider) return null;

    try {
      const response = await fetch(`${this.imageProvider.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.imageProvider.apiKey}`,
        },
        body: JSON.stringify({ model: this.imageProvider.model, prompt }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0]?.url || null;
    } catch {
      return null;
    }
  }

  /** Generate a video using the optional configured video provider. Returns task ID for async polling. */
  async generateVideoTask(prompt: string): Promise<string | null> {
    if (!this.videoProvider) return null;

    try {
      const response = await fetch(`${this.videoProvider.baseURL}/videos/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.videoProvider.apiKey}`,
        },
        body: JSON.stringify({ model: this.videoProvider.model, prompt }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.id || null;
    } catch {
      return null;
    }
  }

  /** Poll for async video generation result. Returns video URL or null. */
  async pollVideoResult(taskId: string, maxAttempts = 30): Promise<string | null> {
    if (!this.videoProvider) return null;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const response = await fetch(`${this.videoProvider.baseURL}/async-result/${taskId}`, {
          headers: { Authorization: `Bearer ${this.videoProvider.apiKey}` },
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data.task_status === 'SUCCESS') {
          return data.video_result?.[0]?.url || null;
        }
        if (data.task_status === 'FAIL') return null;
      } catch {
        continue;
      }
    }
    return null;
  }

  async chat(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
    return this.chatStream(messages, tools);
  }

  /**
   * Streaming LLM call. Uses `stream: true` to receive tokens incrementally.
   * Calls `onToken` for each content delta, keeping SSE connections alive.
   * Returns the same LLMResponse as the non-streaming `chat()`.
   */
  async chatStream(
    messages: LLMMessage[],
    tools?: Tool[],
    onToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (tools && tools.length > 0) {
      body.tools = this.formatTools(tools);
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('LLM API returned empty response body for streaming');
    }

    let content = '';
    const toolCallsMap = new Map<number, ToolCall>();
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') continue;

        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta;

          if (delta?.content) {
            content += delta.content;
            onToken?.(delta.content);
          }

          // Accumulate streamed tool calls by index
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: tc.function?.name || '', arguments: '' },
                });
              }
              const existing = toolCallsMap.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name = tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
            // Emit a synthetic token to keep connection alive during tool call streaming
            onToken?.('');
          }

          // Usage is typically in the final chunk
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens ?? 0,
              completionTokens: chunk.usage.completion_tokens ?? 0,
              totalTokens: chunk.usage.total_tokens ?? 0,
            };
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Estimate usage if the API didn't provide it
    if (usage.totalTokens === 0) {
      const toolArgsLen = [...toolCallsMap.values()].reduce(
        (s, t) => s + t.function.arguments.length,
        0,
      );
      usage.completionTokens = Math.ceil((content.length + toolArgsLen) / 4);
      usage.totalTokens = usage.completionTokens;
    }

    const toolCalls = [...toolCallsMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc);

    return { content: content || null, toolCalls, usage };
  }
}
