import json
import os
import unittest

from playwright.sync_api import sync_playwright, expect


class BrowserChatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(channel=os.getenv('PLAYWRIGHT_CHANNEL', 'chrome'), headless=True)
        cls.base_url = os.getenv('TEST_FRONTEND_URL', 'http://localhost:5173')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000})
        self.page = self.context.new_page()

    def tearDown(self):
        self.context.close()

    def open_room(self):
        self.page.goto(self.base_url)
        expect(self.page.locator('canvas[tabindex="0"]')).to_be_visible(timeout=30000)
        self.page.locator('.room-strip button').filter(has_text='Content').click()
        expect(self.page.get_by_role('log', name='Room discussion')).to_be_visible(timeout=30000)

    def send(self, text):
        self.page.get_by_role('textbox', name='Message the whole room').fill(text)
        self.page.get_by_role('button', name='Send message', exact=True).click()

    def response(self, member='maya', name='Meera', text='Controlled browser test response.', done=True):
        return {'dialogue_protocol': 5, 'done': done, 'routing': {'reason': 'Visual storytelling expertise'}, 'replies': [{'id': f'reply-{member}', 'role': 'assistant', 'memberId': member, 'speaker': name, 'content': text}]}

    def test_frontend_only_has_no_greetings_or_offline_answers(self):
        health = self.context.request.get(f'{self.base_url}/api/chat').json()
        self.assertFalse(health['live'], 'Run this regression with the backend stopped.')
        self.open_room()
        expect(self.page.locator('.message.assistant')).to_have_count(0)
        self.send('Help me storyboard a silent video.')
        expect(self.page.get_by_role('alert')).to_contain_text('Agno backend', timeout=15000)
        expect(self.page.locator('.message.assistant')).to_have_count(0)
        expect(self.page.locator('.message.user')).to_have_count(1)
        expect(self.page.get_by_role('button', name='Resume', exact=True)).to_be_visible()
        self.page.get_by_role('button', name='Resume', exact=True).click()
        expect(self.page.get_by_role('alert')).to_be_visible(timeout=15000)
        expect(self.page.locator('.message.assistant')).to_have_count(0)

    def test_non_first_expert_handoff_completion_and_private_isolation(self):
        requests = []
        def backend(route):
            if route.request.method == 'GET':
                route.fulfill(json={'live': True})
                return
            body = route.request.post_data_json
            requests.append(body)
            if body.get('member'):
                response = self.response('cleo', 'Aditi', 'Controlled private reply.')
            elif len(requests) == 1:
                response = self.response(done=False)
            elif len(requests) == 2:
                response = self.response('theo', 'Kabir', 'Meera, use contrast in the opening.', done=False)
                response['replies'][0].update(replyTo='reply-maya', replyToName='Meera')
            else:
                response = {'dialogue_protocol': 5, 'done': True, 'routing': {'reason': 'Waiting for your audience decision'}, 'replies': []}
            route.fulfill(json=response)
        self.page.route('**/api/chat', backend)
        self.open_room()
        self.send('Help me storyboard a silent video.')
        expect(self.page.locator('.message.assistant')).to_have_count(2)
        expect(self.page.locator('.routing-reason')).to_have_text('Coordinator: Waiting for your audience decision')
        expect(self.page.locator('.message.assistant').first).to_contain_text('Meera')
        expect(self.page.get_by_role('button', name='replying to Meera')).to_be_visible()
        self.assertEqual(len(requests), 3)
        self.assertEqual(requests[1]['messages'][-1]['memberId'], 'maya')
        self.assertEqual(requests[2]['messages'][-1]['memberId'], 'theo')
        self.page.get_by_role('button', name='Meet Aditi', exact=False).click()
        self.page.get_by_role('button', name='Talk privately').click()
        private = self.page.get_by_role('dialog')
        expect(private.locator('.message.assistant')).to_have_count(0)
        private.get_by_role('textbox', name='Message Aditi', exact=True).fill('Private concern')
        private.get_by_role('button', name='Send message', exact=True).click()
        expect(private.locator('.message.assistant')).to_have_count(1)
        self.assertEqual([message['content'] for message in requests[-1]['messages']], ['Private concern'])
        self.assertEqual(requests[-1]['member'], 'cleo')

    def test_stale_offline_health_does_not_block_real_request(self):
        requests = []
        def backend(route):
            if route.request.method == 'GET':
                route.fulfill(json={'live': False})
            else:
                requests.append(route.request.post_data_json)
                route.fulfill(json=self.response())
        self.page.route('**/api/chat', backend)
        self.open_room()
        self.send('The service is back now.')
        expect(self.page.locator('.message.assistant')).to_have_count(1)
        self.assertEqual(len(requests), 1)

    def test_invalid_response_is_not_displayed_as_an_agent(self):
        def backend(route):
            route.fulfill(json={'live': True} if route.request.method == 'GET' else self.response(member='invented', name='Unknown'))
        self.page.route('**/api/chat', backend)
        self.open_room()
        self.send('Reject an unknown speaker.')
        expect(self.page.get_by_role('alert')).to_contain_text('Invalid agent identity')
        expect(self.page.locator('.message.assistant')).to_have_count(0)

    def test_proxy_rejects_invalid_requests(self):
        invalid = self.context.request.post(f'{self.base_url}/api/chat', data='{broken', headers={'Content-Type': 'application/json'})
        self.assertEqual(invalid.status, 400)
        invalid_room = self.context.request.post(f'{self.base_url}/api/chat', data=json.dumps({'room': 'unknown', 'turn': 0, 'round': 0, 'messages': [{'role': 'user', 'content': 'hello'}]}), headers={'Content-Type': 'application/json'})
        self.assertEqual(invalid_room.status, 400)


if __name__ == '__main__':
    unittest.main()
