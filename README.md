# Mahm — TreeHacks 2026

**Make At Home Mmmm.** Your AI nutritionist that knows your allergies, budget, and local stores.

## Project structure

- **Data APIs** (Anika’s work): in **`data-apis/`** — see [data-apis/README.md](data-apis/README.md); run from the `data-apis/` folder.
- **Backend** (Python): in **`backend/`**.
- **Agent app**: in **`multiagents/`** — run from that folder for the Mahm chat UI and APIs below.

| Folder | Owner | Description |
|--------|-------|-------------|
| **multiagents/** | Person B (Agent) | Mahm chat UI + Claude agent. Main entry point for AI chat. |
| **data-apis/** | Person A | Recipe search API (Supabase). Run on port 3001 when using real recipes. |
| **backend/** | Person C | Marketplace API (Flask). Grocery prices, store lookup. Run on port 5000. |
| **ui/** | Person D | Full demo UI (landing, onboarding, chat, marketplace, calendar). Uses dummy data; not wired to agent yet. |

## Person B (Agent) — status

- [x] Claude Agent SDK (Anthropic Messages API) via `/api/chat`
- [x] System prompt with strict nutrition grounding (never state calories without `get_nutrition`)
- [x] Four tools: `search_recipes`, `get_nutrition`, `find_stores`, `generate_meal_plan`
- [x] Proxy routes: `/api/recipes` → data-apis, `/api/marketplace` → backend
- [x] Tools use real APIs when services are running; fall back to mocks otherwise
- [x] Multi-turn memory; Mahm asks clarifying questions before recommending
- [x] Graceful tool failure (errors as JSON, agent responds with fallback)
- [x] Cached demo: `data/demo-conversation.json` + `GET /api/demo`; "Load demo backup" in UI
- [ ] `get_nutrition` and `generate_meal_plan` still use mocks (Person A APIs pending)

## Run locally

### Quick start (agent only, mock data)

```bash
cd multiagents
cp .env.example .env.local
# Add ANTHROPIC_API_KEY to .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Chat with Mahm; use **Load demo backup** for the Greylock-style conversation.

### Full flow (real recipes + marketplace)

Run all three services so `search_recipes` and `find_stores` use real data:

1. **data-apis** (port 3001) — needs Supabase env vars in `data-apis/.env.local`:
   ```bash
   cd data-apis && npm install && npm run dev -- -p 3001
   ```

2. **backend** (port 5000):
   ```bash
   cd backend && pip install -r ../requirements.txt && python run.py
   ```

3. **multiagents** (port 3000):
   ```bash
   cd multiagents && npm run dev
   ```

In `multiagents/.env.local`, set:
- `DATA_APIS_URL=http://localhost:3001`
- `BACKEND_URL=http://localhost:5000`

(Defaults in `.env.example`.) If data-apis or backend are down, tools fall back to mocks.

### Live ingredient scraping (Bright Data MCP)

For real grocery prices instead of the dev catalog:
1. Get an API key from [brightdata.com/cp/setting/users](https://brightdata.com/cp/setting/users)
2. In `multiagents/.env.local`: `BRIGHTDATA_API_KEY=your_key`
3. In `backend/.env`: `MARKETPLACE_PROVIDER=brightdata` and `SCRAPER_SERVICE_URL=http://localhost:3000`
4. Run multiagents and backend. The backend calls multiagents `POST /api/scrape-ingredient`, which uses Bright Data MCP (`search_engine` + `scrape_as_markdown`) to fetch prices.

## Test tool calls

| Method        | Command                                            | Notes                                                            |
|---------------|----------------------------------------------------|------------------------------------------------------------------|
| No API key    | `curl http://localhost:3000/api/test-tools`        | Runs all 4 tools with sample inputs                              |
| With agent    | Chat in UI, e.g. "I'm vegetarian, $80/week, beginner. What should I eat?" | Needs `ANTHROPIC_API_KEY`                            |

## API (multiagents)

| Endpoint            | Method | Description                                                    |
|---------------------|--------|----------------------------------------------------------------|
| `/api/chat`         | POST   | `{ "messages": [...] }` → `{ "text", "toolCalls?", "error?" }` |
| `/api/demo`         | GET    | Cached demo messages                                           |
| `/api/test-tools`   | GET    | Run all tools with sample inputs                               |
| `/api/recipes`         | GET    | Proxy to data-apis (query, max_results, dietary_filters)       |
| `/api/marketplace`     | GET    | Proxy to backend (ingredients, zip)                            |
| `/api/scrape-ingredient` | POST | Bright Data MCP scraper (store, zip, query → price info)       |

## Tech

- **multiagents**: Next.js 15, TypeScript, Tailwind, Anthropic Messages API
- **Tools**: Manual tool loop (4 tools, multi-turn)
- **Proxies**: `/api/recipes` → data-apis `POST /api/search_recipes`, `/api/marketplace` → backend `POST /api/marketplace`
