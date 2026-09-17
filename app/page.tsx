'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,Map,Flame,Sparkles,ArrowLeft,Download,Clapperboard,Code2,Flag,Scissors,Compass,Gamepad2,Headphones,X,Users,MousePointer2,Lock} from 'lucide-react';
import {rooms,Room,Message} from '../lib/rooms';
import {teams,threadKey,speakerAt,Member} from '../lib/teams';
import {demoTurn} from '../lib/demo-dialogue';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import World from '../components/game/World';
import ConversationPanel from '../components/chat/ConversationPanel';
import {Conversation} from '../lib/conversation';
import {COMMONS,roomDestinations,useWorldStore} from '../lib/world-store';
const icons={Clapperboard,Code2,Flag,Scissors,Compass,Gamepad2,Headphones};
export default function Home(){
 const [active,setActive]=useState<Room|null>(null),[live,setLive]=useState(false),[tab,setTab]=useState('world'),[notes,setNotes]=useState<{room:string;text:string}[]>([]),[visited,setVisited]=useState<string[]>([]);
 const [profile,setProfile]=useState<{room:Room;person:Member}|null>(null),[privateChat,setPrivateChat]=useState<{room:Room;person:Member}|null>(null);
 const conversations=useRef<Record<string,Conversation>>({});const liveRef=useRef(live);liveRef.current=live;
 const destination=useWorldStore(s=>s.destination),moving=useWorldStore(s=>s.moving);
 const walkingTo=destination?.roomId?rooms.find(r=>r.id===destination.roomId):null;
 useEffect(()=>{fetch('/api/chat').then(r=>r.json()).then(d=>setLive((d as {live:boolean}).live)).catch(()=>{});return()=>{Object.values(conversations.current).forEach(c=>c.pause());};},[]);
 function discussion(r:Room,person?:Member){
  const key=threadKey(r.id,person?.id);
  if(!conversations.current[key]){
   const cast=person?[person]:teams[r.id];
   const initial:Message[]=cast.map(m=>({id:crypto.randomUUID(),role:'assistant',speaker:m.name,memberId:m.id,content:person?`Just the two of us. ${m.belief} What would you like to work through?`:`I’m ${m.name}, ${m.archetype.toLowerCase()}. ${m.belief}`}));
   let questionnaireStep=0,recipient='';
   conversations.current[key]=new Conversation(initial,person?1:8,async({messages,turn,round,signal})=>{
    const actor=person??speakerAt(r.id,turn,round);
    const latest=[...messages].reverse().find(m=>m.role==='user')?.content??'';
    const questionnaire=!!person&&(latest.startsWith('/to-questionnaire')||questionnaireStep===1||questionnaireStep===2);
    const advance=()=>{if(latest.startsWith('/to-questionnaire'))questionnaireStep=1;else if(questionnaireStep===1){recipient=latest;questionnaireStep=2;}else if(questionnaireStep===2)questionnaireStep=3;};
    if(liveRef.current){
     const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({room:r.id,member:person?.id??null,mode:questionnaire?'questionnaire':'chat',turn,round,messages})});
     const result=await res.json() as {error?:string;replies?:Message[]};
     if(!res.ok||!result.replies?.length)throw new Error(result.error??'This turn could not finish. Resume to retry.');
     const reply=result.replies[0];
     if(reply.memberId!==actor.id||reply.speaker!==actor.name)throw new Error('The agent service needs the latest room personalities.');
     if(questionnaire)advance();return reply;
    }
    await new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,1400);signal.addEventListener('abort',finish,{once:true});});
    if(questionnaire){const content=latest.startsWith('/to-questionnaire')?'Who should answer this questionnaire? Tell me their role and expertise.':questionnaireStep===1?'What facts or decisions do you need back from them?':`DISCOVERY QUESTIONNAIRE\n\nFor: ${recipient}\nUnknowns: ${latest}\n\n1. What can you tell us about these unknowns?\nAnswer:\n\n2. What evidence supports that?\nAnswer:\n\n3. What constraints or risks could change the decision?\nAnswer:\n\n4. What have we missed?\nAnswer:\n\nPlease flag guesses and uncertainty. Save and export this demo template to adapt it.`;if(!signal.aborted)advance();return {id:crypto.randomUUID(),role:'assistant',speaker:actor.name,memberId:actor.id,content} as Message;}
    return demoTurn(actor,messages,turn,!!person);
   });
  }
  return conversations.current[key];
 }
 function arrive(id:string){const r=rooms.find(r=>r.id===id);if(!r)return;setActive(r);setVisited(v=>v.includes(id)?v:[...v,id]);}
 function enter(r:Room){setTab('world');const pos=useWorldStore.getState().position,door=roomDestinations[r.id];if(active?.id===r.id&&!moving&&Math.hypot(pos.x-door.x,pos.y-door.y)<4){arrive(r.id);return;}useWorldStore.getState().moveTo({point:door,roomId:r.id});}
 function leave(){setActive(null);useWorldStore.getState().moveTo({point:{...COMMONS}});}
 function save(r:Room,text:string,person?:Member){setNotes(n=>[...n,{room:r.name+(person?` · Private with ${person.name}`:' · Room discussion'),text}]);setTab('notes');}
 function download(text:string,name:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 return <main className="app"><aside className="rail"><a className="brand" href="/" aria-label="Idea Quest home"><Flame size={26}/></a><button title="The clubhouse" aria-label="The clubhouse" className={tab==='world'?'selected':''} onClick={()=>setTab('world')}><Map/></button><button title="Notebook" aria-label="Notebook" className={tab==='notes'?'selected':''} onClick={()=>setTab('notes')}><BookOpen/>{notes.length>0&&<i/>}</button><div className="rail-bottom"><span className="profile">T</span></div></aside>
 <div className="workspace"><header><div className="wordmark">idea<span>quest</span><span className="alpha">EARLY ACCESS</span></div><div className="header-right"><span className="mode">{live?'LIVE TEAMS':'GUIDED DEMO'}</span><span className="profile small">T</span></div></header>
 <div className="page-heading"><div><div className="eyebrow">YOUR IDEA. A ROOM FULL OF PERSPECTIVES.</div><h1>{tab==='notes'?'Your idea notebook.':'Who’s on your next idea team?'}</h1><p>{tab==='notes'?'The conversations worth coming back to.':'Click to wander. Choose a room. Meet six minds that think differently.'}</p></div><div className="visited"><Sparkles size={17}/><b>{visited.length}<span> / 7</span></b><span>rooms explored</span></div></div>
 {tab==='notes'?<div className="notebook"><button className="back" onClick={()=>setTab('world')}><ArrowLeft size={16}/> Back to the clubhouse</button>{notes.length===0?<div className="empty-notes"><BookOpen size={36}/><h2>A place for your next big thing.</h2><p>Enter a room and save a conversation to keep it here for this visit.</p></div>:notes.map((n,i)=><article key={i}><h2>{n.room}<button onClick={()=>download(n.text,`idea-quest-${i+1}.md`)}><Download size={18}/> Export</button></h2><pre>{n.text}</pre></article>)}</div>:
 <div className="main-grid"><section className="world"><div className="world-title"><div><span className="tiny-square"/> THE CLUBHOUSE <span className="floor">/ FLOOR 01</span></div><span>7 rooms · 42 personalities</span></div>
 <div className="map-wrap"><img className="map-image" src="/assets/clubhouse.png" alt="Pixel-art clubhouse with seven creative team rooms"/><World onEnter={id=>{const r=rooms.find(r=>r.id===id);if(r)enter(r);}} onArrive={arrive}/><div className="map-shade"/>
 {rooms.map((r,i)=>{const Icon=icons[r.icon];return <div key={r.id} className={`map-team ${active?.id===r.id?'chosen':''}`} style={{left:`${r.x}%`,top:`${r.y-6}%`,'--room':r.color} as React.CSSProperties}><button className={`room-pin ${active?.id===r.id?'chosen':''}`} onClick={()=>enter(r)} aria-label={`Join the ${r.short} team`}><span className="pin-number">0{i+1}</span><Icon size={13}/><span>{r.short}</span></button><div className="map-members" aria-label={`${r.short} specialists`}>{teams[r.id].map(m=><button key={m.id} title={`${m.name} · ${m.archetype}`} aria-label={`View ${m.name}, ${m.archetype} in ${r.short}`} onClick={()=>setProfile({room:r,person:m})} style={{'--member':m.color} as React.CSSProperties}><span className="map-person-face">{m.avatar}</span></button>)}</div></div>})}
 <div className="map-caption" aria-live="polite"><span className="live-dot"/>{walkingTo?`Walking to ${walkingTo.short}…`:moving?'On the move…':active?`${active.short} room · six personalities`:'The commons · choose any room'}</div></div>
 <div className="world-controls"><span><MousePointer2 size={14}/> Click floor to walk · hold + drag to guide</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>↵</kbd> join nearby room</span></div>
 <div className="room-strip">{rooms.map(r=>{const Icon=icons[r.icon];return <button key={r.id} className={active?.id===r.id?'active':''} onClick={()=>enter(r)}><Icon size={18} style={{color:r.color}}/><span>{r.short}</span></button>})}</div></section>
 <aside className="chat-panel" style={{'--accent':active?.color||'#c4b0f0'} as React.CSSProperties}>
 {active?<><div className="chat-heading"><div className="host-avatar"><Users size={24}/></div><div><h2>{active.name}<span>ROOM DISCUSSION · 6 + YOU</span></h2><p>{active.short} · Six tastes. One shared conversation.</p></div><button title="Return to commons" aria-label="Return to commons" onClick={leave}><X size={18}/></button></div>
 <ConversationPanel key={active.id} engine={discussion(active)} room={active} live={live} onProfile={person=>setProfile({room:active,person})} onSave={text=>save(active,text)} onQuestionnaire={()=>{const person=teams[active.id][0];setPrivateChat({room:active,person});discussion(active,person).enqueue('/to-questionnaire: Help me prepare questions for someone else.',person.name);}}/></>:
 <><div className="welcome-top"><span className="room-tag">YOU’RE IN THE COMMONS</span><h2>Choose your room.</h2><p>Six personalities are waiting in every room.<br/>Where do you want to take your idea?</p></div>
 {walkingTo&&<div className="walking-status" role="status"><span>Walking to {walkingTo.name}…</span><button onClick={()=>useWorldStore.getState().moveTo(null)}>Cancel</button></div>}
 <div className="room-chooser">{rooms.map(r=>{const Icon=icons[r.icon];return <button key={r.id} onClick={()=>enter(r)}><span className="chooser-icon" style={{background:r.color}}><Icon size={20}/></span><span><b>{r.short}</b><small>{teams[r.id].map(m=>m.name).join(', ')}</small></span><ArrowUpRight size={16}/></button>})}</div>
 <div className="welcome-note"><MousePointer2 size={17}/><span>Click the floor to explore freely.<br/>Join a room to listen, debate, and shape the idea.</span></div><div className="demo-note">{live?'Live teams connected':'Scripted walkthrough available now. Connect the Agno service for live agent-to-agent discussion.'}</div></>}
 </aside></div>}
 <footer><span><span className="footer-star">✦</span> YOUR IDEA. YOUR TEAM. YOUR CALL.</span><span>Six minds. Different tastes. One shared conversation.</span><span>IDEA QUEST <b>v0.4</b></span></footer></div>
 <Dialog open={!!profile} onOpenChange={open=>{if(!open)setProfile(null);}}><DialogContent className="personality-dialog">{profile&&<><div className="personality-identity"><span className="portrait" style={{background:profile.person.color}}>{profile.person.avatar}</span><div><span className="profile-room">{profile.room.short}</span><DialogTitle>{profile.person.name}</DialogTitle><DialogDescription>{profile.person.archetype}</DialogDescription></div></div><div className="trait-tags">{profile.person.traits.map(t=><span key={t}>{t}</span>)}</div><blockquote>“{profile.person.belief}”</blockquote><dl><dt>Core expertise</dt><dd>{profile.person.primarySkill}</dd><dt>Drawn to</dt><dd>{profile.person.taste}</dd><dt>Pushes back on</dt><dd>{profile.person.dislikes}</dd><dt>Blind spot</dt><dd>{profile.person.blindSpot}</dd></dl><div className="profile-skills">Every personality uses grill-me, grilling, and Exa when live.</div><div className="profile-actions"><button onClick={()=>{const p=profile;setProfile(null);enter(p.room);}}><Users size={16}/> Join room discussion</button><button className="private-action" onClick={()=>{const p=profile;setProfile(null);setPrivateChat(p);}}><Lock size={15}/> Talk privately</button></div></>}</DialogContent></Dialog>
 <Dialog open={!!privateChat} onOpenChange={open=>{if(!open)setPrivateChat(null);}}><DialogContent className="private-chat-dialog">{privateChat&&<><div className="private-heading"><span className="portrait" style={{background:privateChat.person.color}}>{privateChat.person.avatar}</span><div><DialogTitle>{privateChat.person.name}</DialogTitle><DialogDescription>{privateChat.person.archetype} · {privateChat.room.name}</DialogDescription></div></div><div className="privacy-note"><Lock size={12}/> Just you and {privateChat.person.name}. The room discussion stays separate.</div><ConversationPanel key={threadKey(privateChat.room.id,privateChat.person.id)} engine={discussion(privateChat.room,privateChat.person)} room={privateChat.room} person={privateChat.person} live={live} onProfile={()=>{}} onSave={text=>{save(privateChat.room,text,privateChat.person);setPrivateChat(null);}}/></>}</DialogContent></Dialog>
 </main>;
}
