import dotenv from 'dotenv';
dotenv.config();

export const config = {
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.LLM_MODEL || 'glm-4-plus',
  },
  tools: {
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    serperApiKey: process.env.SERPER_API_KEY || '',
    jinaApiKey: process.env.JINA_API_KEY || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
};
