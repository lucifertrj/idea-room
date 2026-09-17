'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowUp,BookOpen,CornerDownRight,Flame,Pause,Play,Users,X,Sparkles} from 'lucide-react';
import {Conversation} from '../../lib/conversation';
import {Room} from '../../lib/rooms';
import {Member,teams,speakerAt} from '../../lib/teams';

export default function ConversationPanel({engine,room,person,live,onProfile,onSave,onQuestionnaire}:{engine:Conversation;room:Room;person?:Member;live:boolean;onProfile:(person:Member)=>void;onSave:(text:string)=>void;onQuestionnaire?:()=>void}){
 const state=useSyncExternalStore(engine.subscribe,engine.snapshot,engine.snapshot);
 const [input,setInput]=useState('');
 const scroll=useRef<HTMLDivElement>(null);
 const actor=person??speakerAt(room.id,state.turn,state.round);

 useEffect(()=>{
  const el=scroll.current;
  if(el)el.scrollTo({top:el.scrollHeight,behavior:'smooth'});
 },[state.messages,state.busy]);

 const send=()=>{
  if(engine.enqueue(input,person?.name??'The whole room'))setInput('');
 };

 const save=()=>onSave(state.messages.map(m=>`${m.role==='user'?'You':m.speaker}: ${m.content}`).join('\n\n'));

 return <>
 {!person&&<div className="team-roster">
   <div className="roster-intro">
     <span><Sparkles size={11} className="pixel-sparkle"/> ALL 6 PERSPECTIVES</span>
     <span className="roster-sub">Select a mind to inspect</span>
   </div>
   <div className="specialists">
     {teams[room.id].map(m=>(
       <button
         key={m.id}
         className={`member-card ${state.busy&&actor.id===m.id?'member-speaking':''}`}
         aria-label={`Meet ${m.name}, ${m.archetype}; expert in ${m.primarySkill}`}
         onClick={()=>onProfile(m)}
       >
         <span className="member-avatar" style={{'--m-color':m.color} as React.CSSProperties}>
           {m.avatar}
         </span>
         <b className="member-name">{m.name}</b>
         <span className="member-specialty">{m.role}</span>
         {state.busy&&actor.id===m.id ? (
           <span className="member-speaking-tag">▶ TALKING</span>
         ) : (
           <small>{m.archetype.replace('The ','')}</small>
         )}
       </button>
     ))}
   </div>
 </div>}

 <div className="skill-row">
   <span className="pixel-skill"><Flame size={11}/> GRILL-ME</span>
   <span className="pixel-skill">GRILLING</span>
   <span className={`pixel-skill ${!live?'muted':''}`}>EXA {live?'ONLINE':'READY'}</span>
 </div>

 <div className="messages" ref={scroll} role="log" aria-label={person?`Private messages with ${person.name}`:'Room discussion'} aria-live="polite">
   {state.messages.map(m=>{
     const author=teams[room.id].find(p=>p.id===m.memberId);
     const isUser = m.role === 'user';
     return (
       <div key={m.id} id={`message-${m.id}`} className={`message ${m.role}`}>
         <div className="speaker">
           {isUser ? (
             <span className="speaker-tag user-tag">▶ YOU</span>
           ) : (
             <>
               <span className="speaker-icon" style={{background:author?.color}}>{author?.avatar}</span>
               <span className="speaker-name">{m.speaker}</span>
               <span className="speaker-role">[{author?.archetype.replace('The ','').toUpperCase()}]</span>
             </>
           )}
         </div>
         {m.replyToName&&<button className="reply-reference" onClick={()=>document.getElementById(`message-${m.replyTo}`)?.scrollIntoView({behavior:'smooth',block:'nearest'})}><CornerDownRight size={11}/> replying to {m.replyToName}</button>}
         <p>{m.content}</p>
       </div>
     );
   })}

   {!state.messages.some(m=>m.role==='user')&&<div className="prompts">
     <div className="prompts-label">▶ SELECT AN IDEA QUEST:</div>
     {room.prompts.map(p=>(
       <button key={p} className="pixel-prompt-btn" onClick={()=>engine.enqueue(p,person?.name??'The whole room')}>
         <span>{p}</span>
         <span className="prompt-arrow">▶</span>
       </button>
     ))}
   </div>}

   {state.busy&&<div className="thinking"><span className="cursor-blink">▶</span> {actor.name} is formulating a perspective <span className="pixel-pulse">…</span></div>}

   {!state.busy&&state.messages.some(m=>m.role==='user')&&<div className="round-break">
     <span>{state.paused?'[PAUSED] Discussion awaiting input':'[YOUR MOVE] Steer the roundtable'}</span>
     <button onClick={()=>engine.resume()} className="pixel-resume-btn"><Play size={11}/>{state.paused?'Resume':'Continue'}</button>
   </div>}
 </div>

 {!!state.queue.length&&<div className="message-queue" aria-live="polite">
   <b>{state.queue.length} queued · {state.paused?'resume to deliver':'delivered after this turn'}</b>
   {state.queue.map((m,i)=><div key={m.id}><span>{i+1}. {m.content}</span><button aria-label={`Remove queued message ${i+1}`} onClick={()=>engine.cancel(m.id!)}><X size={12}/></button></div>)}
 </div>}

 {state.error&&<p className="error" role="alert">{state.error}</p>}

 <form className="composer" onSubmit={e=>{e.preventDefault();send();}}>
   <div className="reply-target">
     <Users size={12}/>
     <span>CHANNEL: <b>{person?`DIRECT COMMS [${person.name}]`:'ALL 6 MINDS'}</b></span>
   </div>
   <textarea
     aria-label={`Message ${person?.name??'the whole room'}`}
     placeholder={state.busy?'Jump in — your thought queues for the next turn…':person?`Message ${person.name} on private channel…`:'Pitch an idea. Six minds will debate it.'}
     value={input}
     maxLength={8000}
     onChange={e=>setInput(e.target.value)}
     onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}
   />
   <div className="composer-bottom">
     <span>{state.busy?'Queued for next turn':'Enter ⏎ to send'}</span>
     <div className="composer-actions">
       {state.busy&&<button type="button" className="pause-discussion" onClick={()=>engine.pause()}><Pause size={13}/> Pause</button>}
       <button aria-label={state.busy?'Queue message':'Send message'} className="pixel-send-btn" disabled={!input.trim()}><ArrowUp size={16}/></button>
     </div>
   </div>
 </form>

 {state.messages.length>=130&&!state.busy&&<button className="questionnaire" onClick={()=>{save();engine.reset();}}>Save & start a fresh discussion</button>}

 <div className="chat-footer">
   <span className="live-status"><span className="led-dot"/> {live?'LIVE AGENT SYSTEM':'SIMULATED ENGINE'}</span>
   <button onClick={save} className="pixel-save-btn"><BookOpen size={12}/> EXPORT NOTE</button>
 </div>

 {onQuestionnaire&&state.round>0&&<button className="questionnaire" onClick={onQuestionnaire}>Generate Question Blueprint</button>}
 </>;
}
