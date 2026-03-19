import express from 'express';
import { config } from './config.js';
import { LLMClient } from './llm/client.js';
import { ToolRegistry } from './tools/registry.js';
import { createSearchTool } from './tools/search.js';
import { createVisitTool } from './tools/visit.js';
import { createPythonTool } from './tools/python.js';
import { createScholarTool } from './tools/scholar.js';
import { createFileParserTool } from './tools/file-parser.js';
import { Orchestrator } from './orchestrator/orchestrator.js';
import { createRouter } from './api/router.js';

const app = express();
app.use(express.json());

// Initialize LLM client (OpenAI-compatible for ZhipuAI GLM-4)
const llm = new LLMClient(config.llm);

// Initialize tool registry
const toolRegistry = new ToolRegistry();
if (config.tools.tavilyApiKey) toolRegistry.register(createSearchTool(config.tools.tavilyApiKey));
if (config.tools.jinaApiKey) toolRegistry.register(createVisitTool(config.tools.jinaApiKey));
toolRegistry.register(createPythonTool());
if (config.tools.serperApiKey) toolRegistry.register(createScholarTool(config.tools.serperApiKey));
toolRegistry.register(createFileParserTool());

// Initialize orchestrator
const orchestrator = new Orchestrator(llm, toolRegistry);

// Mount API routes
app.use(createRouter(orchestrator));

// Serve frontend static files (production build)
app.use(express.static('web/dist'));

app.listen(config.server.port, () => {
  console.log(`Mini DeepResearch Agent running on http://localhost:${config.server.port}`);
  console.log(`Registered tools: ${toolRegistry.getAll().map((t) => t.definition.name).join(', ')}`);
});
