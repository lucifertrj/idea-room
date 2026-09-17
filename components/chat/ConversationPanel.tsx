'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowUp,BookOpen,CornerDownRight,Flame,Pause,Play,Users,X} from 'lucide-react';
import {Conversation} from '../../lib/conversation';
import {Room} from '../../lib/rooms';
import {Member,teams,speakerAt} from '../../lib/teams';
export default function ConversationPanel({engine,room,person,live,onProfile,onSave,onQuestionnaire}:{engine:Conversation;room:Room;person?:Member;live:boolean;onProfile:(person:Member)=>void;onSave:(text:string)=>void;onQuestionnaire?:()=>void}){
 const state=useSyncExternalStore(engine.subscribe,engine.snapshot,engine.snapshot);
 const [input,setInput]=useState('');const scroll=useRef<HTMLDivElement>(null);
 const actor=person??speakerAt(room.id,state.turn,state.round);
 useEffect(()=>{const el=scroll.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:'smooth'});},[state.messages,state.busy]);
 const send=()=>{if(engine.enqueue(input,person?.name??'The whole room'))setInput('');};
 const save=()=>onSave(state.messages.map(m=>`${m.role==='user'?'You':m.speaker}: ${m.content}`).join('\n\n'));
 return <>
 {!person&&<div className="team-roster"><div className="roster-intro"><span>THE WHOLE ROOM · ALL 6 VOICES</span><span>Click to meet someone</span></div><div className="specialists">{teams[room.id].map(m=><button key={m.id} className={state.busy&&actor.id===m.id?'member-speaking':''} aria-label={`Meet ${m.name}, ${m.archetype}; expert in ${m.primarySkill}`} onClick={()=>onProfile(m)}><span className="member-avatar" style={{background:m.color}}>{m.avatar}</span><b>{m.name}</b><span className="member-specialty">{m.role}</span><small>{state.busy&&actor.id===m.id?'Speaking…':m.archetype.replace('The ','')}</small></button>)}</div></div>}
 <div className="skill-row"><span><Flame size={12}/> grill-me</span><span>grilling</span><span className={!live?'muted':''}>Exa {live?'ready':'offline'}</span></div>
 <div className="messages" ref={scroll} role="log" aria-label={person?`Private messages with ${person.name}`:'Room discussion'} aria-live="polite">{state.messages.map(m=>{const author=teams[room.id].find(p=>p.id===m.memberId);return <div key={m.id} id={`message-${m.id}`} className={`message ${m.role}`}><span className="speaker">{m.role==='user'?'YOU → '+(person?.name??'EVERYONE'):<><span className="speaker-icon" style={{background:author?.color}}>{author?.avatar}</span>{m.speaker}<span className="speaker-role">{author?.archetype.replace('The ','')}</span></>}</span>{m.replyToName&&<button className="reply-reference" onClick={()=>document.getElementById(`message-${m.replyTo}`)?.scrollIntoView({behavior:'smooth',block:'nearest'})}><CornerDownRight size={12}/> replying to {m.replyToName}</button>}<p>{m.content}</p></div>})}
 {!state.messages.some(m=>m.role==='user')&&<div className="prompts">{room.prompts.map(p=><button key={p} onClick={()=>engine.enqueue(p,person?.name??'The whole room')}>{p}</button>)}</div>}
 {state.busy&&<div className="thinking">{actor.name} is {live?'thinking':'taking the next demo turn'}…</div>}
 {!state.busy&&state.messages.some(m=>m.role==='user')&&<div className="round-break"><span>{state.paused?'Paused · your messages are safe':'Your turn to steer.'}</span><button onClick={()=>engine.resume()}><Play size={13}/>{state.paused?'Resume':'Continue discussion'}</button></div>}
 </div>
 {!!state.queue.length&&<div className="message-queue" aria-live="polite"><b>{state.queue.length} queued · {state.paused?'resume to deliver':'delivered after this turn'}</b>{state.queue.map((m,i)=><div key={m.id}><span>{i+1}. {m.content}</span><button aria-label={`Remove queued message ${i+1}`} onClick={()=>engine.cancel(m.id!)}><X size={12}/></button></div>)}</div>}
 {state.error&&<p className="error" role="alert">{state.error}</p>}
 <form className="composer" onSubmit={e=>{e.preventDefault();send();}}><div className="reply-target"><Users size={13}/><span>To: <b>{person?`Only ${person.name}`:'All six people'}</b></span></div><textarea aria-label={`Message ${person?.name??'the whole room'}`} placeholder={state.busy?'Jump in — your message joins after this turn…':person?`Message ${person.name} privately…`:'Drop an idea. Let six perspectives challenge it.'} value={input} maxLength={8000} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><div><span>{state.busy?'Your message will join the queue.':'Enter to send · Shift + Enter for a new line'}</span>{state.busy&&<button type="button" className="pause-discussion" onClick={()=>engine.pause()}><Pause size={14}/> Pause</button>}<button aria-label={state.busy?'Queue message':'Send message'} disabled={!input.trim()}><ArrowUp size={18}/></button></div></form>
 {state.messages.length>=130&&!state.busy&&<button className="questionnaire" onClick={()=>{save();engine.reset();}}>Save & start a fresh discussion</button>}
 <div className="chat-footer"><span>{live?'Live discussion':'Scripted walkthrough · not live agents'}</span><button onClick={save}><BookOpen size={14}/> Save</button></div>
 {onQuestionnaire&&state.round>0&&<button className="questionnaire" onClick={onQuestionnaire}>Make a questionnaire in a private window</button>}
 </>;
}
