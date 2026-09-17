# Idea Quest live agents

The web app is an App Router-compatible Vinext application hosted on a JavaScript Worker. Agno requires a separate Python service. No credentials are bundled. The published app uses an explicitly labeled scripted demo until this service is connected.

## Start the service

1. Copy `.env.example` to `.env` inside this directory and set OpenAI, Exa, and a strong shared `AGNO_API_TOKEN`.
2. Build: `docker build -t idea-quest-agents .`
3. Run: `docker run --env-file .env -p 8000:8000 idea-quest-agents`
4. Deploy this container to an HTTPS container host.
5. Set the web app's server-side `AGNO_API_URL` and matching `AGNO_API_TOKEN` through Sites environment settings.

Each request builds a fresh room agent and provides only that room's conversation as role-preserving messages. There is no shared cross-user history. All 42 personalities receive `grill-me` and `grilling` instructions unconditionally, expose Agno Skills loading, and have Exa search. `to-questionnaire` is loaded on explicit request. Skills are the upstream Matt Pocock SKILL.md files from skills/productivity. Runtime instructions adapt Skill calls to Agno loading, replace unavailable sub-agent research with Exa, and return questionnaire Markdown for browser export.

Readiness is checked through authenticated `/health`. Browser users never receive the service token or provider keys. Sessions and notebook entries currently live only for the browser visit; export notes before reloading. Production persistence, per-user budgets and streaming belong in the next sprint.

Sources:
- https://docs.agno.com/skills/loading-skills
- https://docs.agno.com/tools/toolkits/search/exa
- https://github.com/mattpocock/skills/blob/main/docs/productivity/grill-me.md
- https://github.com/mattpocock/skills/blob/main/docs/productivity/grilling.md
- https://github.com/mattpocock/skills/blob/main/docs/productivity/to-questionnaire.md

Compatibility note: the upstream `disable-model-invocation` frontmatter key is removed because Agno validates a different set of frontmatter fields. Skill bodies are retained.

## Current personality roundtable
This replaces the sprint-2 broadcast behavior. Every room now has six people with distinct tastes, traits, beliefs and blind spots. The server instantiates the selected Agno personality with both compulsory grilling skills and Exa. The browser conducts a bounded sequence of eight turns: all six people contribute, then two revisit the discussion. Each request includes every completed earlier turn, including responses from the current round. A response is appended before the next agent is called; parallel broadcast and a single synthetic narrator are not used. `replyTo` and `replyToName` record the preceding other speaker being addressed.

Each request contains `turn` (0–7), `round`, room, optional private member, mode, and role-preserving messages with speaker IDs. `/health` must advertise `dialogue_protocol: 4` before this frontend enables live requests.

The default room is a group conversation. Clicking a person opens their personality profile. The explicit private-chat action opens a separate visit-local thread keyed by room and member; no group transcript is copied into a private thread, and no private transcript is copied back. The backend rejects assistant messages from other personalities in a private thread.

Pause aborts the browser wait and stops subsequent turns. An already-running provider call can still finish on the service. Completed contributions remain visible. Resume continues at the next unfinished turn. The walkthrough is explicitly scripted and demonstrates interaction only; live model behavior still requires credentials and service deployment.

Agno reference reviewed: https://docs.agno.com/teams/overview . This app uses an explicit turn coordinator over Agno Agents so every contribution remains visible and interruptible; it does not hide the discussion behind a leader summary.

Run the dependency-free boundary tests with `python -m unittest discover -s backend/tests -v`.

User input is queued per thread and delivered between completed turns. Group and private workers have isolated transcripts. The UI keeps all six names visible; private chat opens in a separate dialog. Long threads stop before the API message limit rather than silently discarding earlier context.

Each personality has an explicit `primarySkill`, plus a unique archetype, traits, taste, belief, and blind spot. Core expertise is shown in profiles and inserted into live agent instructions. Stable internal member IDs are retained while display names are Indian names. See the complete 42-person roster in `../progress.md`.
