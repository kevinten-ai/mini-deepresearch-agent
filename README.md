# Mini DeepResearch Agent

A transparent, educational deep research system built for **Workshop 6**. Multi-agent architecture with real-time visualization of the entire research pipeline.

**Live Demo: [deepresearch.rxcloud.group](https://deepresearch.rxcloud.group)**

## Screenshots

### Landing Page
Input your research query, choose mode (Report/Q&A), configure agents and iterations.

![Landing Page](docs/screenshots/homepage.png)

### Research Process — 3-Column Layout
Left: Agent cards with status and progress. Center: Thinking process with phase visualization (Think → Act → Observe → Evaluate → Rebuild). Right: Event stream timeline and stats.

![Research Process](docs/screenshots/research-process.png)

### Pipeline & Agent Loop
Top: 5-stage pipeline progress (Dispatch → Research → Synthesize → Media → Complete). Agent loop diagram shows the current ReAct phase. Context window bar visualizes Markovian state rebuild growth.

![Pipeline & Agent Loop](docs/screenshots/research-pipeline.png)

## Architecture

```
User Query --> Orchestrator --> [Agent 1] [Agent 2] ... [Agent N]  --> Synthesizer --> Report
                                   |          |            |
                              ReAct Loop  ReAct Loop  ReAct Loop
                            (Think-Act-Observe-Evaluate-Rebuild)
```

Each research agent runs an independent **ReAct loop** with **Markovian State Rebuild** — the evolving report compresses all prior findings into a bounded context window, enabling unlimited iterations without context overflow.

## Key Features

- **Multi-Agent Parallel Research** — Orchestrator decomposes queries into perspectives, agents research independently
- **5-Phase ReAct Loop** — Think, Act (tool calling), Observe, Evaluate (self-reflection), State Rebuild
- **Markovian State Rebuild** — Bounded context growth via evolving report compression
- **Real-time Visualization** — Pipeline progress, prompt composition, streaming indicators, loop diagrams
- **Multimedia Reports** — Mermaid diagrams (client-side), AI-generated images (CogView), rich Markdown
- **Streaming LLM** — Token-level streaming keeps SSE connections alive, prevents serverless timeouts
- **Graceful Degradation** — Deadline mechanism, partial results, `Promise.allSettled` for agent failures

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Mermaid.js, DOMPurify |
| Backend | TypeScript, Vercel Serverless Functions |
| LLM | ZhipuAI GLM-4-Plus (OpenAI-compatible API) |
| Search | Tavily API |
| Web Reader | Jina Reader API |
| Scholar | Serper API |
| Images | CogView API (AI image generation) |

## Project Structure

```
api/
  research.ts          # Vercel serverless SSE endpoint
src/
  agent/
    research-agent.ts  # ReAct loop agent with streaming
  orchestrator/
    orchestrator.ts    # Multi-agent coordination + synthesis
    synthesizer.ts     # Report merging with visual content
  llm/
    client.ts          # Streaming LLM client (OpenAI-compatible)
  tools/
    search.ts          # Tavily search tool
    visit.ts           # Jina web reader tool
    scholar.ts         # Serper scholar tool
  tracer/
    tracer.ts          # Execution trace recorder
web/
  src/
    pages/
      HomePage.tsx     # Landing page with architecture diagram
      ResearchPage.tsx # Main research UI with pipeline progress
    components/
      ThinkingProcess.tsx  # Educational phase visualization
      LoopDiagram.tsx      # Animated ReAct loop
      AgentCard.tsx        # Agent sidebar with streaming indicator
      ReportRenderer.tsx   # Markdown + Mermaid report display
      MermaidBlock.tsx     # Safe Mermaid diagram rendering
      TraceTimeline.tsx    # Event timeline
```

## Getting Started

### Prerequisites

- Node.js 18+
- API keys: ZhipuAI (LLM), Tavily (search), Jina (web reader)

### Setup

```bash
# Install dependencies
npm install && cd web && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run locally
npm run dev:web    # Frontend (Vite dev server)
npm run dev        # Backend (if running standalone)
```

### Deploy to Vercel

```bash
vercel deploy
```

Set environment variables in Vercel dashboard:
- `LLM_API_KEY` — ZhipuAI API key
- `LLM_BASE_URL` — `https://open.bigmodel.cn/api/paas/v4`
- `LLM_MODEL` — `glm-4-plus`
- `TAVILY_API_KEY` — Tavily search API key
- `JINA_API_KEY` — Jina reader API key
- `SERPER_API_KEY` — (optional) Serper scholar API key
- `FUNCTION_TIMEOUT` — `60` (Hobby) or `300` (Pro plan)

## Educational Design

This project is designed for teaching AI agent concepts:

1. **Prompt Composition Panel** — Shows exactly what the LLM receives each round
2. **Context Window Bar** — Visualizes bounded growth from Markovian state rebuild
3. **Phase Annotations** — Each phase has expandable concept explanations (ReAct, Chain-of-Thought, etc.)
4. **Pipeline Progress** — 5-stage pipeline from Dispatch to Complete
5. **Streaming Indicator** — Shows live token generation with character count

## License

MIT
