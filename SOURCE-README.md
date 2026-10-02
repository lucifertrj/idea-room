# Idea Room — source package

A walkable pixel-art clubhouse with seven niches and six expert personalities per room. Navigation uses Content, Technical, Sports, Fashion, Travel, Gaming & Anime, and Music; animal-movement names label the conversations.

## Run the frontend

Use Node.js 24 (required for the included TypeScript orchestration test command).

```sh
npm run install:ci
npm run dev
```

Open the local URL printed by the dev server. A clean extracted copy defaults to the portable execution profile. The UI runs as a clearly labeled scripted demo without backend credentials.

```sh
npm run build
node --experimental-transform-types --test tests/conversation.test.mjs
python -m unittest discover -s backend/tests -v
```

The frontend uses React, an App Router-compatible Vinext shell, Phaser, and Zustand. See the starter README for runtime details.

## Enable live agents

Follow `backend/README.md` to deploy the Python Agno service. Every one of the 42 personalities has a distinct core expertise and persona, and receives grill-me, grilling, Agno Skills loading, and Exa search. Model, search, and service credentials are not included. Configure `AGNO_API_URL` and `AGNO_API_TOKEN` server-side for the web app; `/health` must report dialogue protocol 4.

## Main files

- `app/page.tsx`: map/navigation, profiles, private windows, per-thread coordinators.
- `components/chat/ConversationPanel.tsx`: roster, transcript, composer, queue.
- `lib/conversation.ts`: sequential turns, FIFO interruptions, pause/retry, context limit.
- `backend/team-data.json`: canonical 42 personalities shared by frontend and backend.
- `backend/app.py`: Agno model and skill integration.
- `backend/skills/`: compulsory grilling skills and questionnaire skill.
- `public/assets/`: map and character artwork.
- `progress.md`: completed work, outstanding work, and full persona/expertise roster.

## Current limits

Live agents need a separately deployed backend and credentials. Histories and notebook entries last for the browser visit; export before reloading. Threads stop before the message limit rather than silently dropping context. A burst pauses after 24 agent turns. Private and group histories stay separate. Demo responses illustrate the interaction and are not live reasoning.

This package includes tracked source and assets, not installed dependencies, build output, credentials, or Git history. `.openai/hosting.json` identifies the existing Idea Room Site; use your own project identity if deploying a separate copy.
