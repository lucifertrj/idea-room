# Idea Quest

A pixel-art clubhouse with seven rooms and six expert personalities per room. Users can join a group discussion, queue messages between agent turns, or open a private chat.

**Stack:** React + Vinext (Next.js App Router-compatible), Phaser, Zustand, FastAPI, Agno, and Exa.

**Current architecture:** an Agno/OpenAI coordinator selects the relevant expert first, delegates follow-ups from the shared transcript, and stops when appropriate. No scripted chat responses. See [communication_flow.md](communication_flow.md) for routing and agent-to-agent communication.

## Requirements

- Node.js 24 and npm
- Docker running, for the live Python backend
- An OpenAI API key; an Exa API key is optional for live research

## 1. Start the frontend

```bash
cd idea-quest
npm run install:ci
npm run dev
```

Open the URL printed in the terminal, normally **http://localhost:5173**. Without a configured, running backend, chat reports an error and generates no assistant replies.

## 2. Configure the backend

In a second terminal, from the project root:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```dotenv
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
OPENAI_MODEL=gpt-5.2
AGNO_API_TOKEN=your-shared-service-token
```

Use a model available to your OpenAI account. Generate a shared token with `openssl rand -hex 32`, then use that same value in both backend and frontend configuration.

Build and start the backend:

```bash
docker build -t idea-quest-agents ./backend
docker run --rm --name idea-quest-agents \
  --env-file backend/.env \
  -p 127.0.0.1:8000:8000 \
  idea-quest-agents
```

Keep this terminal running. Docker installs Python dependencies and includes the agent skill files.

## 3. Connect the frontend

From the project root:

```bash
cp .env.example .env
```

Edit the root `.env`:

```dotenv
AGNO_API_URL=http://127.0.0.1:8000
AGNO_API_TOKEN=the-same-token-from-backend-env
```

Restart `npm run dev`, then reload the page. The frontend checks readiness on page load and every 15 seconds. Every chat submission goes to the backend even if the last health check failed.

The root `.env` supplies local Worker bindings; do not prefix these values with `VITE_` or `NEXT_PUBLIC_`. Provider keys belong only in `backend/.env`. If you already use `.dev.vars`, put the two frontend values there instead—Cloudflare gives that file precedence over `.env`. [Environment loading reference](https://developers.cloudflare.com/workers/local-development/environment-variables/)

## 4. Verify the connection

Replace the token placeholder below with your configured shared token:

```bash
curl http://127.0.0.1:8000/health \
  -H "Authorization: Bearer YOUR_SHARED_TOKEN"
```

Expected response:

```json
{"ready":true,"search_enabled":true,"rooms":7,"team_chat":true,"dialogue_protocol":5}
```

Then check the frontend proxy:

```bash
curl http://localhost:5173/api/chat
```

Expected: `{"live":true}`. Use the actual frontend port if different.

Enter Content and submit an idea. The coordinator chooses the relevant expert rather than cycling through everyone. Send another message during a turn to check the queue. Open a personality profile and select **Talk privately** to check the separate conversation. Stop the backend and submit again: an error must appear without an assistant reply.

Readiness checks configuration, not provider credentials or quotas. A successful live reply is the final connection check.

## Agent configuration

- `backend/team-data.json`: all 42 personas and their core expertise.
- `backend/skills/grill-me/`: mandatory interview skill for every agent.
- `backend/skills/grilling/`: mandatory questioning workflow used by `grill-me`.
- `backend/skills/to-questionnaire/`: questionnaire guidance, used on request.
- `backend/app.py`: model, tools, persona instructions, and live responses.
- `lib/conversation.ts`: turn coordination, queues, and pause/resume.

Every expert receives both compulsory grilling skills, plus Exa when configured. Tool selection happens within its Agno run; completed public replies become context for the coordinator and next selected expert. Private histories stay separate.

## Build and tests

From the project root:

```bash
npm run build
node --experimental-transform-types --test tests/*.test.mjs
```

With Python 3.12 and the backend requirements installed locally:

```bash
AGNO_TELEMETRY=false python3 -m unittest discover -s backend/tests -v
```

## Deploy

Deploy the backend container to an HTTPS container host with the four backend environment variables. Configure the frontend's server-side `AGNO_API_URL` to that HTTPS origin and `AGNO_API_TOKEN` to the matching secret. Publish the frontend through Sites.

A hosted frontend cannot reach the backend at your laptop's `127.0.0.1`. The included `.openai/hosting.json` belongs to the existing Idea Quest Site; use your own Site identity for a separate deployment.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Backend unavailable | Backend is running; root environment values are set; restart frontend and retry |
| Health returns 401 | Both sides use the same shared token |
| Health returns `ready:false` | Backend has an OpenAI key; recreate the container after editing its environment |
| Live mode appears but replies fail | Model access, provider keys/quotas, and backend terminal logs |
| Skills fail to load | Preserve all directories under `backend/skills/` |
| Conversations disappear after reload | Expected: history and notebook are visit-local; export before reloading |

Keep real environment files out of version control. See `communication_flow.md` for the current architecture and its limits.
