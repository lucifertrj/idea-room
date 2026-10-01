# Agno/OpenAI backend

Chat requires this running Python service and an OpenAI key. There are no offline
chat responses. The frontend proxy uses a shared service token; provider keys
never belong in frontend code or public environment variables.

## Run locally

From the repository root:

```bash
cp backend/.env.example backend/.env
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn backend.app:app --env-file backend/.env --host 127.0.0.1 --port 8000
```

Set `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.2`), and a strong
`AGNO_API_TOKEN` in `backend/.env` before running. `EXA_API_KEY` is optional;
without it agents cannot perform live research. Docker instructions and frontend
connection settings are in the root README.

## Coordination

A structured-output Agno coordinator chooses the expert whose expertise matches
the latest user request. It receives all completed turns and can delegate a
specific follow-up, request synthesis, or finish. The selected expert makes its
own OpenAI call; the coordinator never impersonates it. There is no fixed speaker
order or obligation to use all six members.

Each expert receives the persona from `team-data.json`, compulsory `grill-me`
and `grilling` instructions, Agno Skills, and optional Exa search. The
`to-questionnaire` skill is used when requested; questionnaires are model-generated.
The runtime adapts upstream Skill calls to Agno loading and returns Markdown
rather than writing or sending files.

Private requests bypass the coordinator and call only the selected expert.
Group and private histories remain separate. Each request builds fresh agents;
there is no shared cross-user memory or persistent backend transcript store.

See `../communication_flow.md` for the sequence diagram, handoff contract,
budgets, queue/pause semantics, and trust boundaries.

## API and failures

- Authenticated `GET /health` reports OpenAI configuration readiness,
  `search_enabled`, and `dialogue_protocol: 5`. It does not verify credentials
  against providers or guarantee model access.
- Authenticated `POST /chat` accepts room, optional private member, mode, and
  role-preserving messages. Legacy `turn`/`round` fields remain accepted for
  frontend bookkeeping, but do not select the speaker.
- The response contains `replies`, `done`, `routing.reason`, and protocol 5.
  A coordinator finish returns no chat message. Each generated reply has a stable
  ID and exact roster attribution; a handoff can reference an earlier reply ID.
- Invalid routes, empty output, missing keys, and provider failures return HTTP
  errors with no fallback content. A total request deadline is 50 seconds.
- At most eight expert contributions follow one user input. This is not a quota
  system: client histories are untrusted and require server-owned sessions for
  production-grade integrity and per-user billing limits.

## Tests

From the repository root, with dependencies installed:

```bash
AGNO_TELEMETRY=false backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

Tests use controlled agent results and a controlled HTTP transport through the
real Agno/OpenAI SDK stack. They need no provider key and do not prove live model
quality. For browser regression tests, install `backend/requirements-test.txt`,
start the frontend on port 5173 with the backend stopped, and run
`python -m unittest discover -s tests -p 'test_browser.py' -v`.
