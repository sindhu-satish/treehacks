# Mahm — TreeHacks 2026

**Make At Home Mmmm.** Your AI nutritionist that knows your allergies, budget, and local stores.

- **Data APIs** (Anika’s work) are in **`data-apis/`** — see [data-apis/README.md](data-apis/README.md); run that app from the `data-apis/` folder.
- **Backend** (Python) is in **`backend/`**.
- **Agent app** (this repo root) — run from here for the Mahm chat UI and APIs below.

## Person B (Agent Lead) — 3pm deliverable

- [x] Claude Agent SDK (Anthropic Messages API) initialized and connected to frontend `/api/chat`
- [x] System prompt v1 with strict nutrition grounding (never state calories without `get_nutrition`)
- [x] All four tools implemented and callable: `search_recipes`, `get_nutrition`, `find_stores`, `generate_meal_plan` (stub with structured mock when algorithm not ready)
- [x] Multi-turn memory; Mahm asks clarifying questions before recommending
- [x] Full flow: constraints → 3 meals with real nutrition → "where can I buy?" → `find_stores` results
- [x] Graceful failure if a tool breaks (errors returned as JSON, agent responds with fallback message)
- [x] One cached demo conversation: `data/demo-conversation.json` + `GET /api/demo`; "Load demo backup" in UI

## Run locally (agent app at root)

```bash
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Chat with Mahm; use **Load demo backup** to load the cached Greylock-style conversation.

## How to test tool calls

**1. Test tool implementations (no API key)**  
Start the app, then open or curl:

```bash
curl http://localhost:3000/api/test-tools
```

**2. Test tool calls through the agent (needs `ANTHROPIC_API_KEY`)**  
Send prompts that trigger tools; see README for examples. The JSON response includes `toolCalls` when the agent used tools.

## API

- **POST /api/chat** — Body: `{ "messages": [ { "role": "user"|"assistant", "content": "..." } ] }`. Returns `{ "text", "toolCalls?", "error?" }`.
- **GET /api/demo** — Returns cached demo messages for backup.
- **GET /api/test-tools** — Runs all four tools with sample inputs (no API key).

## Tech

- Next.js 15, TypeScript, Tailwind
- Anthropic Messages API with manual tool loop (4 tools, multi-turn)
- Mock data for recipes, nutrition, stores, meal plan until backend APIs are ready
