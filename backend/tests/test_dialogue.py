import json
import unittest
from pathlib import Path
from backend.dialogue import choose_speaker, checked_transcript

TEAMS = json.loads((Path(__file__).parents[1] / 'team-data.json').read_text())

class DialogueTests(unittest.TestCase):
    def test_all_six_speak_then_revisit_the_discussion(self):
        for room, roster in TEAMS.items():
            self.assertEqual(len(roster), 6)
            self.assertEqual(len({m['taste'] for m in roster}), 6)
            speakers = [choose_speaker(TEAMS, room, None, i, 0, 'chat') for i in range(8)]
            self.assertEqual({m['id'] for m in speakers[:6]}, {m['id'] for m in roster})
            self.assertIn(speakers[6]['id'], {m['id'] for m in speakers[:6]})

    def test_prior_agent_turns_are_preserved_for_the_next_agent(self):
        history = [{'role': 'user', 'content': 'A deliberately unusual idea'}]
        for turn in range(8):
            actor = choose_speaker(TEAMS, 'content', None, turn, 0, 'chat')
            transcript = checked_transcript(TEAMS['content'], None, history)
            self.assertEqual(len(transcript), turn + 1)
            if turn:
                self.assertEqual(transcript[-1]['content'], f'Unique argument {turn-1}')
            history = [*history, {'role': 'assistant', 'speaker': actor['name'], 'memberId': actor['id'], 'content': f'Unique argument {turn}'}]

    def test_private_thread_rejects_another_persons_messages(self):
        cleo, theo = TEAMS['content'][:2]
        with self.assertRaises(ValueError):
            checked_transcript(TEAMS['content'], cleo['id'], [{'role':'assistant','speaker':theo['name'],'memberId':theo['id'],'content':'group-only message'}])
        private = [{'role':'assistant','speaker':cleo['name'],'memberId':cleo['id'],'content':'private-only message'}]
        self.assertEqual(checked_transcript(TEAMS['content'], cleo['id'], private), private)

    def test_wrong_room_and_unknown_speaker_rejected(self):
        with self.assertRaises(ValueError):
            choose_speaker(TEAMS,'content','ada',0,0,'chat')
        with self.assertRaises(ValueError):
            checked_transcript(TEAMS['content'],None,[{'role':'assistant','speaker':'Ada','memberId':'ada','content':'other room'}])

    def test_private_and_questionnaire_are_single_person_routes(self):
        for turn in range(8):
            self.assertEqual(choose_speaker(TEAMS,'content','theo',turn,3,'chat')['id'],'theo')
            self.assertEqual(choose_speaker(TEAMS,'content',None,turn,3,'questionnaire')['id'],'cleo')

if __name__=='__main__': unittest.main()
