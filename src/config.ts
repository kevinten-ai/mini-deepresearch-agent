import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';
const DEFAULT_ARK_MODEL = 'doubao-seed-2-0-code-preview-260215';

export const config = {
  llm: {
    apiKey: process.env.ARK_API_KEY || '',
    baseURL: process.env.ARK_BASE_URL || DEFAULT_ARK_BASE_URL,
    model: process.env.ARK_CHAT_MODEL || DEFAULT_ARK_MODEL,
    image: {
      apiKey: process.env.ARK_IMAGE_API_KEY || '',
      baseURL: process.env.ARK_IMAGE_BASE_URL || '',
      model: process.env.ARK_IMAGE_MODEL || '',
    },
    video: {
      apiKey: process.env.ARK_VIDEO_API_KEY || '',
      baseURL: process.env.ARK_VIDEO_BASE_URL || '',
      model: process.env.ARK_VIDEO_MODEL || '',
    },
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
