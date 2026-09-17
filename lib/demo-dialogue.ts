import type {Message} from './rooms';
import type {Member} from './teams';
export function demoTurn(member:Member,messages:Message[],turn:number,privateChat=false):Message{
 const previous=[...messages].reverse().find(m=>m.role==='assistant'&&m.memberId!==member.id);
 const idea=messages.find(m=>m.role==='user')?.content??'this idea';
 const latest=[...messages].reverse().find(m=>m.role==='user')?.content??idea;
 const name=previous?.speaker??'the room';
 const lines=[
  `For “${idea.slice(0,130)}”, my instinct is this: ${member.proposal} I’m drawn to ${member.taste.toLowerCase()}. Who sees a problem with that direction?`,
  `${name}, I’m not sold on that yet. My concern is ${member.dislikes.toLowerCase()}. ${member.proposal} Would that make the idea more compelling, or are we losing what you liked about it?`,
  `${name}, there’s something useful in that objection. I’d keep the original ambition but change the form: ${member.proposal} That gives us something concrete to compare with the earlier suggestion.`,
  `I want to test the assumption behind what ${name} just proposed. My preference is ${member.taste.toLowerCase()}. Before we commit, what would we need to observe in a small first attempt?`,
  `${name}, a test helps, but the result depends on what we value. ${member.proposal} I’d judge that through ${member.taste.toLowerCase()}, not just whether people say they like it.`,
  `${name}, I think we’re still assuming everyone wants the same experience. ${member.proposal} That’s a different bet. Which version would the user actually be excited to make?`,
  `${name}, that changes the way I’d frame my earlier suggestion. I still care about ${member.taste.toLowerCase()}, but I can see how my blind spot could get in the way: ${member.blindSpot.toLowerCase()} Let’s keep both directions open until we test them.`,
  `The disagreement is useful: ${name} has pushed us toward a different version of the idea. My preference remains: ${member.proposal} Your call—which direction should we explore next, and what should we drop?`
 ];
 const interruption=messages.at(-1)?.role==='user'&&latest!==idea?`I hear your update: “${latest.slice(0,140)}”.\n\n`:'';
 const content=privateChat?`On “${latest.slice(0,160)}”: ${member.belief}\n\n${member.proposal}\n\n${member.question}`:interruption+lines[turn];
 return {id:crypto.randomUUID(),role:'assistant',speaker:member.name,memberId:member.id,content,...(!privateChat&&previous?{replyTo:previous.id,replyToName:previous.speaker}: {})};
}
