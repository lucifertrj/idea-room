"""Pure routing and transcript boundary rules for the personality roundtable."""
MAX_TURNS = 8

def room_roster(teams, room, member):
    if room not in teams:
        raise ValueError('Unknown room')
    roster = teams[room]
    if member:
        result = next((m for m in roster if m['id'] == member), None)
        if result is None:
            raise ValueError('This person is not in the room')
    return roster

def turns_since_user(messages):
    count = 0
    for item in reversed(messages):
        if item['role'] == 'user':
            return count
        count += 1
    raise ValueError('A user message is required')

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
