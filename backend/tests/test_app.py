import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from openai import AsyncOpenAI
from agno.models.openai import OpenAIResponses
from backend import app as service


class ChatTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.environment = patch.dict(os.environ, {'AGNO_API_TOKEN': 'test-token', 'OPENAI_API_KEY': 'test-key', 'EXA_API_KEY': '', 'AGNO_TELEMETRY': 'false'})
        self.environment.start()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=service.app), base_url='http://backend', headers={'Authorization': 'Bearer test-token'})
        self.member = service.TEAMS['content'][2]
        self.user = {'role': 'user', 'content': 'Help with visual storytelling', 'id': 'user-1'}

    async def asyncTearDown(self):
        await self.client.aclose()
        self.environment.stop()

    def decision(self, **changes):
        return service.RoutingDecision(**{
            'action': 'speak', 'member_id': self.member['id'],
            'reason': 'Visual expertise matches the question', 'task': 'Evaluate the visual narrative',
            'reply_to': None, **changes,
        })

    async def post(self, messages=None, **fields):
        return await self.client.post('/chat', json={'room': 'content', 'messages': messages or [self.user], **fields})

    def agents(self, decision=None, text='Use a visual contrast to establish the stakes.'):
        coordinator = SimpleNamespace(arun=AsyncMock(return_value=SimpleNamespace(content=decision or self.decision())))
        expert = SimpleNamespace(instructions=[], arun=AsyncMock(return_value=SimpleNamespace(content=text)))
        return coordinator, expert

    async def test_relevant_expert_can_start_instead_of_roster_first(self):
        coordinator, expert = self.agents()
        with patch.object(service, 'build_coordinator', return_value=coordinator), patch.object(service, 'build_agent', return_value=expert) as factory:
            response = await self.post()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['replies'][0]['memberId'], self.member['id'])
        self.assertNotEqual(self.member['id'], service.TEAMS['content'][0]['id'])
        self.assertEqual(factory.call_args.args[1], self.member)
        self.assertIn('Evaluate the visual narrative', expert.instructions[0])
        self.assertFalse(response.json()['done'])

    async def test_handoff_sees_exact_prior_reply_and_user_correction(self):
        previous = {'id': 'expert-1', 'role': 'assistant', 'memberId': 'theo', 'speaker': 'Kabir', 'content': 'Meera, can this work without narration?'}
        correction = {'id': 'user-2', 'role': 'user', 'content': 'Only silent video is allowed.'}
        coordinator, expert = self.agents(self.decision(reply_to='expert-1'))
        with patch.object(service, 'build_coordinator', return_value=coordinator), patch.object(service, 'build_agent', return_value=expert):
            response = await self.post([self.user, previous, correction])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['replies'][0]['replyTo'], 'expert-1')
        self.assertEqual(response.json()['replies'][0]['replyToName'], 'Kabir')
        routed = json.loads(coordinator.arun.call_args.args[0])
        self.assertEqual(routed['turns_used'], 0)
        self.assertEqual(routed['transcript'][-1]['content'], correction['content'])
        history = expert.arun.call_args.args[0]
        self.assertIn(previous['content'], history[1].content)
        self.assertIn(correction['content'], history[-1].content)

    async def test_coordinator_can_finish_without_generating_a_message(self):
        previous = {'role': 'assistant', 'memberId': self.member['id'], 'speaker': self.member['name'], 'content': 'Which audience are you targeting?'}
        coordinator, expert = self.agents(self.decision(action='finish', member_id=None, task=''))
        with patch.object(service, 'build_coordinator', return_value=coordinator), patch.object(service, 'build_agent', return_value=expert) as factory:
            response = await self.post([self.user, previous])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['done'])
        self.assertEqual(response.json()['replies'], [])
        factory.assert_not_called()

    async def test_invalid_delegations_fail_closed(self):
        for decision in [self.decision(member_id='unknown'), self.decision(reply_to='invented'), self.decision(action='finish', member_id=None, task=''), self.decision(task=' ')]:
            with self.subTest(decision=decision):
                coordinator, expert = self.agents(decision)
                with patch.object(service, 'build_coordinator', return_value=coordinator), patch.object(service, 'build_agent', return_value=expert) as factory:
                    response = await self.post()
                self.assertEqual(response.status_code, 502)
                self.assertNotIn('replies', response.json())
                factory.assert_not_called()

    async def test_private_and_questionnaire_bypass_coordinator(self):
        for mode in ['chat', 'questionnaire']:
            coordinator, expert = self.agents()
            with patch.object(service, 'build_coordinator', return_value=coordinator) as routing, patch.object(service, 'build_agent', return_value=expert):
                response = await self.post(member=self.member['id'], mode=mode)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()['done'])
            routing.assert_not_called()
            self.assertIn('private one-to-one', expert.instructions[0])

    async def test_missing_key_and_auth_fail_without_agent_calls(self):
        with patch.object(service, 'build_coordinator') as factory:
            unauthorized = await self.client.post('/chat', headers={'Authorization': 'Bearer wrong'}, json={'room': 'content', 'messages': [self.user]})
            with patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
                missing = await self.post()
                health = await self.client.get('/health')
        self.assertEqual(unauthorized.status_code, 401)
        self.assertEqual(missing.status_code, 503)
        self.assertFalse(health.json()['ready'])
        factory.assert_not_called()

    async def test_exa_is_optional_and_health_is_only_configuration_readiness(self):
        response = await self.client.get('/health')
        self.assertTrue(response.json()['ready'])
        self.assertFalse(response.json()['search_enabled'])
        self.assertEqual(response.json()['dialogue_protocol'], 5)
        self.assertEqual(service.build_agent('content', self.member, 'chat').tools, [])

    async def test_budget_uses_transcript_not_client_turn_counter(self):
        previous = {'role': 'assistant', 'memberId': self.member['id'], 'speaker': self.member['name'], 'content': 'A completed contribution'}
        with patch.object(service, 'build_coordinator') as factory:
            response = await self.post([self.user, *[previous.copy() for _ in range(8)]], turn=0)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['done'])
        factory.assert_not_called()

    async def test_provider_failure_and_empty_response_never_fall_back(self):
        for failure in [RuntimeError('provider rejected request'), TimeoutError(), None]:
            coordinator, expert = self.agents(text=' ')
            expert.arun.side_effect = failure
            with patch.object(service, 'build_coordinator', return_value=coordinator), patch.object(service, 'build_agent', return_value=expert):
                response = await self.post()
            self.assertEqual(response.status_code, 504 if isinstance(failure, TimeoutError) else 502)
            self.assertNotIn('replies', response.json())

    async def test_private_history_and_invalid_room_rejected(self):
        wrong = {'role': 'assistant', 'memberId': 'theo', 'speaker': 'Kabir', 'content': 'Group secret'}
        self.assertEqual((await self.post([self.user, wrong], member=self.member['id'])).status_code, 400)
        self.assertEqual((await self.post(room='unknown')).status_code, 400)
        self.assertEqual((await self.post(member='unknown')).status_code, 400)

    async def test_real_agno_and_openai_sdk_with_controlled_http_transport(self):
        requests = []
        def provider(request):
            payload = json.loads(request.content)
            requests.append(payload)
            text = self.decision().model_dump_json() if len(requests) == 1 else 'Controlled provider response from the visual expert.'
            return httpx.Response(200, json={
                'id': f'resp_{len(requests)}', 'object': 'response', 'created_at': 1,
                'model': payload['model'], 'status': 'completed', 'error': None,
                'output': [{'id': f'msg_{len(requests)}', 'type': 'message', 'status': 'completed', 'role': 'assistant', 'content': [{'type': 'output_text', 'text': text, 'annotations': []}]}],
                'usage': {'input_tokens': 10, 'output_tokens': 10, 'total_tokens': 20},
            })
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as http_client:
            provider_client = AsyncOpenAI(api_key='test-key', http_client=http_client)
            def model():
                return OpenAIResponses(id='gpt-5.2', async_client=provider_client)
            with patch.object(service, 'openai_model', side_effect=model):
                response = await self.post()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(requests), 2)
        self.assertEqual(requests[0]['text']['format']['type'], 'json_schema')
        self.assertEqual(response.json()['replies'][0]['content'], 'Controlled provider response from the visual expert.')
        self.assertTrue(any('Evaluate the visual narrative' in str(item) for item in requests[1]['input']))


if __name__ == '__main__':
    unittest.main()
