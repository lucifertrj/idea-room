"""Formal A2A (Agent2Agent) layer: each expert is an A2A agent that colleagues can
consult directly. Agent cards + JSON-RPC `message/send`, using the a2a-sdk pydantic
types for spec-compliant wire format. The protocol lives here; all Agno/model work
stays in app.py and is injected via callbacks to avoid a circular import."""
import asyncio
from uuid import uuid4
from typing import Awaitable, Callable

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from a2a.types import (
    AgentCard, AgentCapabilities, AgentProvider, AgentSkill,
    Message, Part, Role, TextPart,
    MessageSendParams, SendMessageRequest, SendMessageResponse,
    SendMessageSuccessResponse, JSONRPCErrorResponse,
    JSONParseError, InvalidRequestError, MethodNotFoundError, InvalidParamsError, InternalError,
)

PROTOCOL_VERSION = '0.3.0'
SEND_METHOD = 'message/send'
CONSULT_TIMEOUT = 20  # seconds; the nested consult must finish well inside /chat's 50s budget.


def expert_card(base_url: str, room: str, member: dict) -> AgentCard:
    """A spec-compliant Agent Card describing one expert as an A2A agent."""
    skill_id = member['role'].lower().replace(' ', '-')
    return AgentCard(
        protocol_version=PROTOCOL_VERSION,
        name=member['name'],
        description=f"{member['role']} specialist in the {room} room — {member['archetype']}. Core expertise: {member['primarySkill']}.",
        url=f"{base_url.rstrip('/')}/a2a/{room}/{member['id']}",
        preferred_transport='JSONRPC',
        version='1.0.0',
        provider=AgentProvider(organization='Idea Quest', url=base_url.rstrip('/')),
        capabilities=AgentCapabilities(streaming=False),
        default_input_modes=['text/plain'],
        default_output_modes=['text/plain'],
        skills=[AgentSkill(
            id=skill_id, name=member['primarySkill'], description=member['primarySkill'],
            tags=[member['role'].lower(), *(" ".join(member['traits']).lower().split())],
            examples=[member['question']],
        )],
    )


def _text_of(message: Message) -> str:
    """Concatenate the text parts of an A2A message."""
    chunks = [part.root.text for part in message.parts if isinstance(part.root, TextPart)]
    return '\n'.join(chunk for chunk in chunks if chunk).strip()


def _agent_message(text: str) -> Message:
    """A direct `agent`-role reply message (spec-permitted for simple interactions)."""
    return Message(role=Role.agent, message_id=uuid4().hex, parts=[Part(root=TextPart(text=text))])


def _rpc_error(request_id, error) -> dict:
    return JSONRPCErrorResponse(id=request_id, error=error).model_dump(mode='json', exclude_none=True)


def create_router(authenticate, teams, room_roster, run_consulted) -> APIRouter:
    """Build the A2A router.

    - `authenticate(authorization)` / `teams` / `room_roster` are reused from app.py.
    - `run_consulted(room, member, text)` runs the consulted expert (built WITHOUT the
      consult tool, with a tight budget) and returns its reply string.
    """
    router = APIRouter()

    def _member(room: str, member: str) -> dict:
        try:
            roster = room_roster(teams, room, member)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return next(entry for entry in roster if entry['id'] == member)

    @router.get('/a2a/{room}/{member}/.well-known/agent-card.json')
    async def agent_card(room: str, member: str, request: Request, authorization: str | None = Header(default=None)):
        authenticate(authorization)
        entry = _member(room, member)
        base = str(request.base_url)
        return expert_card(base, room, entry).model_dump(mode='json', exclude_none=True)

    @router.post('/a2a/{room}/{member}')
    async def message_send(room: str, member: str, request: Request, authorization: str | None = Header(default=None)):
        authenticate(authorization)
        entry = _member(room, member)
        try:
            body = await request.json()
        except Exception:
            return _rpc_error(None, JSONParseError())
        if not isinstance(body, dict) or body.get('jsonrpc') != '2.0':
            return _rpc_error(body.get('id') if isinstance(body, dict) else None, InvalidRequestError())
        request_id = body.get('id')
        if body.get('method') != SEND_METHOD:
            return _rpc_error(request_id, MethodNotFoundError())
        try:
            params = MessageSendParams.model_validate(body.get('params'))
        except Exception:
            return _rpc_error(request_id, InvalidParamsError())
        text = _text_of(params.message)
        if not text:
            return _rpc_error(request_id, InvalidParamsError())
        try:
            answer = await run_consulted(room, entry, text)
        except Exception:
            return _rpc_error(request_id, InternalError())
        result = SendMessageSuccessResponse(id=request_id, result=_agent_message(answer))
        return result.model_dump(mode='json', exclude_none=True)

    return router


def build_consult_tool(app, token: str, room: str, roster: list[dict], self_id: str) -> Callable[..., Awaitable[str]]:
    """An Agno tool letting the primary expert consult ONE colleague over A2A this turn.

    The call is a real JSON-RPC `message/send` round-trip performed in-process via an
    ASGI transport (no socket), carrying the shared Bearer token. Bounded to one
    consult per turn; consulted experts never receive this tool, so depth is exactly 1.
    """
    names = {member['id']: member['name'] for member in roster}
    budget = {'left': 1}

    async def ask_colleague(member_id: str, question: str) -> str:
        """Consult one colleague in this room and get their expert view.

        Args:
            member_id: The colleague's roster id (e.g. 'maya'). Must be another expert, not yourself.
            question: A single focused question for that colleague.

        Returns:
            The colleague's answer prefixed with their name, or a short note if they are unavailable.
        """
        if budget['left'] <= 0:
            return 'You have already consulted a colleague this turn. Finish your own reply.'
        if member_id == self_id:
            return 'That id is you — answer from your own expertise instead of consulting yourself.'
        if member_id not in names:
            return f"No colleague with id '{member_id}' in this room. Available: {sorted(names)}."
        budget['left'] -= 1
        payload = SendMessageRequest(
            id=uuid4().hex,
            params=MessageSendParams(message=Message(
                role=Role.user, message_id=uuid4().hex, parts=[Part(root=TextPart(text=question))],
            )),
        ).model_dump(mode='json', exclude_none=True)
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://a2a') as client:
                response = await asyncio.wait_for(
                    client.post(f'/a2a/{room}/{member_id}', json=payload, headers={'Authorization': f'Bearer {token}'}),
                    timeout=CONSULT_TIMEOUT,
                )
            parsed = SendMessageResponse.model_validate(response.json()).root
            if isinstance(parsed, SendMessageSuccessResponse) and isinstance(parsed.result, Message):
                answer = _text_of(parsed.result)
                if answer:
                    return f'{names[member_id]}: {answer}'
            return f'{names[member_id]} did not return a usable answer; proceed with your own view.'
        except Exception:
            return f'{names[member_id]} is unavailable right now; proceed with your own view.'

    return ask_colleague
