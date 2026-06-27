# Repository Guidelines

## Project Structure

- `src/` contains the TypeScript backend/orchestration code for the research agent.
- `src/orchestrator/` coordinates decomposition, agent fan-out, and synthesis.
- `src/agent/` contains the ReAct-style research agent loop.
- `src/tools/` contains search, visit, scholar, Python, and file parser tools.
- `src/api/` contains server-side router/SSE handling.
- `web/` is the React/Vite visual frontend.
- `docs/diagrams/` and `docs/screenshots/` support README and teaching material.

## Commands

- `npm install && cd web && npm install && cd ..` installs both root and frontend dependencies.
- `npm run dev` starts the standalone TypeScript backend watcher.
- `npm run dev:web` starts the Vite frontend.
- `npm run lint` runs TypeScript checks for root and `web/`.
- `npm run type-check` is the same TypeScript check entry.
- `npm run test` runs Vitest.
- `npm run build` builds the root TypeScript package and frontend.

## Environment

Use `.env.example` as the template and create `.env` locally. Do not commit `.env`.

Required for full research behavior:

- `ARK_API_KEY`
- `ARK_BASE_URL`
- `ARK_CHAT_MODEL`
- `TAVILY_API_KEY`
- `JINA_API_KEY`

Optional:

- `ARK_IMAGE_*` and `ARK_VIDEO_*` are reserved for verified media providers; do not route media generation through chat completions.
- `SERPER_API_KEY` enables scholar search.
- `PORT` configures the standalone server.

## Deployment

- Production URL: `https://deepresearch.rxcloud.group`.
- Hosting: Vercel.
- `vercel.json` installs root + web dependencies and outputs `web/dist`.
- Serverless functions under `api/*.ts` are configured with `maxDuration: 300`.

## Maintenance Notes

- Keep README, `.env.example`, and Vercel environment variables aligned.
- Avoid committing generated `dist/`, `web/dist/`, `.vercel/`, local traces, or `.env`.
- The research workflow depends on external paid APIs; tests should mock network and LLM calls unless explicitly running a manual integration smoke test.
