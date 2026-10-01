import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from a2a.types import AgentCard, SendMessageResponse, SendMessageSuccessResponse, Message, Role

from backend import app as service


class A2ATests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.environment = patch.dict(os.environ, {'AGNO_API_TOKEN': 'test-token', 'OPENAI_API_KEY': 'test-key', 'EXA_API_KEY': '', 'AGNO_TELEMETRY': 'false'})
        self.environment.start()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=service.app), base_url='http://backend', headers={'Authorization': 'Bearer test-token'})
        self.roster = service.TEAMS['content']
        self.member = self.roster[0]  # cleo / Aditi
        self.colleague = self.roster[2]  # maya / Meera

    async def asyncTearDown(self):
        await self.client.aclose()
        self.environment.stop()

    def consulted(self, text='A sharp strategic angle in two sentences.'):
        return SimpleNamespace(arun=AsyncMock(return_value=SimpleNamespace(content=text)))

    def send_payload(self, text='One-line positioning?', method='message/send', jsonrpc='2.0', request_id='1'):
        return {'jsonrpc': jsonrpc, 'id': request_id, 'method': method,
                'params': {'message': {'kind': 'message', 'role': 'user', 'messageId': 'u1', 'parts': [{'kind': 'text', 'text': text}]}}}

    # --- Agent card discovery ---
    async def test_agent_card_is_spec_compliant(self):
        response = await self.client.get(f"/a2a/content/{self.member['id']}/.well-known/agent-card.json")
        self.assertEqual(response.status_code, 200)
        card = AgentCard.model_validate(response.json())  # raises if non-compliant
        self.assertEqual(card.name, self.member['name'])
        self.assertTrue(card.url.endswith(f"/a2a/content/{self.member['id']}"))
        self.assertEqual(card.preferred_transport, 'JSONRPC')
        self.assertFalse(card.capabilities.streaming)
        self.assertEqual(card.skills[0].name, self.member['primarySkill'])

    async def test_card_requires_auth_and_valid_member(self):
        unauth = await self.client.get(f"/a2a/content/{self.member['id']}/.well-known/agent-card.json", headers={'Authorization': 'Bearer wrong'})
        self.assertEqual(unauth.status_code, 401)
        self.assertEqual((await self.client.get('/a2a/content/nobody/.well-known/agent-card.json')).status_code, 400)
        self.assertEqual((await self.client.get(f"/a2a/unknown/{self.member['id']}/.well-known/agent-card.json")).status_code, 400)

    # --- message/send ---
    async def test_message_send_returns_direct_agent_message(self):
        with patch.object(service, 'build_consulted_agent', return_value=self.consulted('Lead with the single person, not the trend.')) as factory:
            response = await self.client.post(f"/a2a/content/{self.member['id']}", json=self.send_payload())
        self.assertEqual(response.status_code, 200)
        parsed = SendMessageResponse.model_validate(response.json()).root
        self.assertIsInstance(parsed, SendMessageSuccessResponse)
        self.assertIsInstance(parsed.result, Message)
        self.assertEqual(parsed.result.role, Role.agent)
        self.assertIn('Lead with the single person', parsed.result.parts[0].root.text)
        self.assertEqual(factory.call_args.args[1], self.member)  # built WITH the right persona

    async def test_message_send_rpc_errors(self):
        bad_json = await self.client.post(f"/a2a/content/{self.member['id']}", content=b'{not json', headers={'Content-Type': 'application/json'})
        self.assertEqual(bad_json.json()['error']['code'], -32700)
        wrong_method = await self.client.post(f"/a2a/content/{self.member['id']}", json=self.send_payload(method='tasks/get'))
        self.assertEqual(wrong_method.json()['error']['code'], -32601)
        empty_text = await self.client.post(f"/a2a/content/{self.member['id']}", json=self.send_payload(text=''))
        self.assertEqual(empty_text.json()['error']['code'], -32602)
        unauth = await self.client.post(f"/a2a/content/{self.member['id']}", json=self.send_payload(), headers={'Authorization': 'Bearer wrong'})
        self.assertEqual(unauth.status_code, 401)

    # --- consult tool (real in-process A2A round-trip) ---
    async def test_consult_tool_roundtrips_over_a2a(self):
        tool = service.a2a_module.build_consult_tool(service.app, 'test-token', 'content', self.roster, self.member['id'])
        with patch.object(service, 'build_consulted_agent', return_value=self.consulted('Show, do not narrate.')):
            answer = await tool(self.colleague['id'], 'What could visuals carry here?')
        self.assertEqual(answer, f"{self.colleague['name']}: Show, do not narrate.")

    async def test_consult_tool_is_bounded_and_validated(self):
        tool = service.a2a_module.build_consult_tool(service.app, 'test-token', 'content', self.roster, self.member['id'])
        self.assertIn('is you', await tool(self.member['id'], 'q'))          # cannot consult self
        self.assertIn('No colleague', await tool('ghost', 'q'))             # unknown id
        with patch.object(service, 'build_consulted_agent', return_value=self.consulted('first')):
            first = await tool(self.colleague['id'], 'q')
            second = await tool(self.colleague['id'], 'q')
        self.assertIn('first', first)
        self.assertIn('already consulted', second)                          # budget of one per turn

    # --- build helpers / depth-1 invariant ---
    def test_primary_gets_tool_consulted_does_not(self):
        marker = lambda member_id, question: 'x'
        primary = service.build_agent('content', self.member, 'chat', consult_tool=marker)
        self.assertIn(marker, primary.tools)
        self.assertTrue(any('ask_colleague' in line for line in primary.instructions))
        consulted = service.build_consulted_agent('content', self.member)
        self.assertEqual(consulted.tools or [], [])

    async def test_health_reports_a2a(self):
        health = (await self.client.get('/health')).json()
        self.assertTrue(health['a2a_enabled'])
        self.assertEqual(health['a2a_cards'], sum(len(r) for r in service.TEAMS.values()))


if __name__ == '__main__':
    unittest.main()
