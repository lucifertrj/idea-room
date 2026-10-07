# Idea Room

A pixel-art clubhouse with seven rooms and six expert personalities per room. Users can join a group discussion, queue messages between agent turns, or open a private chat.

https://github.com/user-attachments/assets/d4964d23-a74f-47c4-93dc-9291b5a6d786

**Current architecture:** an Agno/OpenAI coordinator selects the relevant expert first, delegates follow-ups from the shared transcript, and stops when appropriate. Tools used: Agent Skills: grill-me, grilling and to-questionnarire and Exa Search (backend)

## Requirements

- Node.js 24 and npm
- Docker running, for the live Python backend
- An OpenAI API key; an Exa API key is optional for live research

## 1. Start the frontend

```bash
cd idea-room
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
docker build -t idea-room-agents ./backend
docker run --rm --name idea-room-agents \
  --env-file backend/.env \
  -p 127.0.0.1:8000:8000 \
  idea-room-agents
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

## Demo video

<a href="https://www.youtube.com/watch?v=0m2E6lWaiOA" target="_blank" rel="noopener noreferrer">
  <img src="https://img.youtube.com/vi/0m2E6lWaiOA/hqdefault.jpg" alt="Idea Room demo video thumbnail" width="640" />
</a>
