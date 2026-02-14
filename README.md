# Mahm — TreeHacks 2026

**Make At Home Mmmm.** Your AI nutritionist that knows your allergies, budget, and local stores.

## Person B (Agent Lead) — 3pm deliverable

- [x] Claude Agent SDK (Anthropic Messages API) initialized and connected to frontend `/api/chat`
- [x] System prompt v1 with strict nutrition grounding (never state calories without `get_nutrition`)
- [x] All four tools implemented and callable: `search_recipes`, `get_nutrition`, `find_stores`, `generate_meal_plan` (stub with structured mock when algorithm not ready)
- [x] Multi-turn memory; Mahm asks clarifying questions before recommending
- [x] Full flow: constraints → 3 meals with real nutrition → “where can I buy?” → `find_stores` results
- [x] Graceful failure if a tool breaks (errors returned as JSON, agent responds with fallback message)
- [x] One cached demo conversation: `data/demo-conversation.json` + `GET /api/demo`; “Load demo backup” in UI

## Run locally

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

This runs all four tools with sample inputs and returns their raw outputs (mock recipes, nutrition, stores, meal plan).

**2. Test tool calls through the agent (needs `ANTHROPIC_API_KEY`)**  
Send prompts that trigger tools and check the response:

- **search_recipes + get_nutrition:** e.g. *"I'm vegetarian, $80/week. What should I eat?"*
- **find_stores:** e.g. *"Where can I buy red lentils and coconut milk? Zip 94305."* (after a prior message about a recipe)
- **generate_meal_plan:** e.g. *"Plan my week — vegetarian, $80 budget."*

In the UI, after each reply you’ll see which tools were used (if the frontend shows `toolCalls`). Or call the API directly:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Plan my week, vegetarian, $80"}]}'
```

The JSON response includes `"toolCalls": [{ "name": "...", "input": { ... } }]` when the agent used tools.

## API

- **POST /api/chat** — Body: `{ "messages": [ { "role": "user"|"assistant", "content": "..." } ] }`. Returns `{ "text", "toolCalls?", "error?" }`.
- **GET /api/demo** — Returns cached demo messages for backup.
- **GET /api/test-tools** — Runs all four tools with sample inputs (for testing; no API key).

## When Person A/C APIs exist

Set in `.env.local`:

- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000` (used by tools to call your app’s APIs)
- Add `/api/recipes`, `/api/nutrition`, `/api/marketplace`, `/api/meal-plan`; the agent tools will call them and fall back to mocks if unavailable.

## Tech

- Next.js 15, TypeScript, Tailwind
- Anthropic Messages API with manual tool loop (4 tools, multi-turn)
- Mock data for recipes, nutrition, stores, meal plan until backend APIs are ready
