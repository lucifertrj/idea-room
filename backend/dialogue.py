"""Pure routing and transcript boundary rules for the personality roundtable."""
ORDER = (0, 1, 2, 3, 4, 5, 0, 2)

def choose_speaker(teams, room, member, turn, round_number, mode):
    if room not in teams:
        raise ValueError('Unknown room')
    roster = teams[room]
    if member:
        result = next((m for m in roster if m['id'] == member), None)
        if result is None:
            raise ValueError('This person is not in the room')
        return result
    if mode == 'questionnaire':
        return roster[0]
    return roster[(ORDER[turn] + round_number) % len(roster)]

def checked_transcript(roster, member, messages):
    valid = {m['id']: m['name'] for m in roster}
    for item in messages:
        if item['role'] == 'assistant':
            author = item.get('memberId')
            if author not in valid or item.get('speaker') != valid[author]:
                raise ValueError('Unknown speaker in transcript')
            if member and author != member:
                raise ValueError('Private conversations cannot include other agents')
    return list(messages)
