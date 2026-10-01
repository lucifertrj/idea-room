import json
import unittest
from pathlib import Path
from backend.dialogue import room_roster, turns_since_user, checked_transcript

TEAMS = json.loads((Path(__file__).parents[1] / 'team-data.json').read_text())

class DialogueTests(unittest.TestCase):
    def test_all_six_are_available_without_a_fixed_speaker_order(self):
        for room, roster in TEAMS.items():
            self.assertEqual(len(roster), 6)
            self.assertEqual(len({m['taste'] for m in roster}), 6)
            self.assertEqual(room_roster(TEAMS, room, None), roster)

    def test_prior_agent_turns_are_preserved_for_the_next_agent(self):
        history = [{'role': 'user', 'content': 'A deliberately unusual idea'}]
        for turn in range(8):
            actor = TEAMS['content'][turn % 6]
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
            room_roster(TEAMS,'content','ada')
        with self.assertRaises(ValueError):
            checked_transcript(TEAMS['content'],None,[{'role':'assistant','speaker':'Ada','memberId':'ada','content':'other room'}])

    def test_count_resets_on_latest_user_message(self):
        self.assertEqual(turns_since_user([{'role':'user'}, {'role':'assistant'}, {'role':'user'}, {'role':'assistant'}]), 1)
        with self.assertRaises(ValueError):
            turns_since_user([{'role':'assistant'}])

if __name__=='__main__': unittest.main()
