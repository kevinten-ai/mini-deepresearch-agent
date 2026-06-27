# Mini DeepResearch Agent Triage - 2026-06-27

## Repository

- GitHub: `kevinten-ai/mini-deepresearch-agent`
- Production site: `https://deepresearch.rxcloud.group`
- Backend/orchestrator: TypeScript under `src/`
- Frontend: React + Vite under `web/`
- Hosting: Vercel

## Public Route Check

- `https://deepresearch.rxcloud.group`: HTTP 200 in global domain probe

## Local State

- Worktree was source-clean before this pass.
- Ignored local artifacts include `.env`, `.playwright-mcp/`, `.vercel/`, root `node_modules/`, `web/dist/`, and `web/node_modules/`.

## Actions Taken

- Added root `AGENTS.md` documenting structure, commands, environment, deployment, and maintenance rules.
- Added `lint` and `type-check` scripts that run TypeScript checks for root and `web/`.
- Added a local `pdf-parse` module declaration so strict TypeScript checks cover the file parser tool without adding another dependency.
- Fast-forwarded local `main` to the remote Ark runtime migration and no-tools production-path fix.
- Updated `.env.example` API key placeholders to non-secret placeholders so routine secret scans do not flag them as credentials.
- Updated the historical implementation plan's environment examples to Ark CodingPlan and non-secret placeholders.
- Removed a stale `@ts-expect-error` from the PDF parser after adding the local `pdf-parse` module declaration.

## Follow-Up

- Add explicit frontend linting if the project wants style/React lint coverage beyond TypeScript.
- Keep Vercel function timeout expectations aligned with the deployed plan.
- Add integration smoke tests only with mocked or disposable API keys; avoid spending paid search/LLM quota in default tests.
- Review frontend chunk splitting; the production build currently warns about chunks over 500 kB.

## Validation

- `npm run lint`: passed
- `npm run test`: passed, 4 files / 7 tests
- `npm run build`: passed, with existing Vite large chunk warnings
- Real Ark `LLMClient` smoke: returned content with no tool calls.
- Secret-pattern scan: passed; remaining API key strings are environment variable names or payload field names
- `python3 tools/project_workspace_inventory.py`: passed; repository readiness is 100 in the refreshed global inventory
