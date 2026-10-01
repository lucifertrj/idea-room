'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,Map,Flame,Sparkles,ArrowLeft,Download,Clapperboard,Code2,Flag,Scissors,Compass,Gamepad2,Headphones,X,Users,MousePointer2,Lock} from 'lucide-react';
import {rooms,Room} from '../lib/rooms';
import {teams,threadKey,Member} from '../lib/teams';
import {chatResponseSchema} from '../lib/chat-protocol';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import World from '../components/game/World';
import ConversationPanel from '../components/chat/ConversationPanel';
import ThemeSelector from '../components/ui/ThemeSelector';
import {Conversation} from '../lib/conversation';
import {COMMONS,roomDestinations,useWorldStore} from '../lib/world-store';
const icons={Clapperboard,Code2,Flag,Scissors,Compass,Gamepad2,Headphones};
export default function Home(){
 const [active,setActive]=useState<Room|null>(null),[live,setLive]=useState(false),[tab,setTab]=useState('world'),[notes,setNotes]=useState<{room:string;text:string}[]>([]),[visited,setVisited]=useState<string[]>([]);
 const [profile,setProfile]=useState<{room:Room;person:Member}|null>(null),[privateChat,setPrivateChat]=useState<{room:Room;person:Member}|null>(null);
 const conversations=useRef<Record<string,Conversation>>({});
 const destination=useWorldStore(s=>s.destination),moving=useWorldStore(s=>s.moving);
 const walkingTo=destination?.roomId?rooms.find(r=>r.id===destination.roomId):null;
 useEffect(()=>{
  let mounted=true;
  const refresh=()=>{void fetch('/api/chat').then(r=>r.json()).then(d=>{if(mounted)setLive((d as {live:boolean}).live===true);}).catch(()=>{if(mounted)setLive(false);});};
  refresh();const interval=setInterval(refresh,15000);const threads=conversations.current;
  return()=>{mounted=false;clearInterval(interval);Object.values(threads).forEach(c=>c.pause());};
 },[]);
 function discussion(r:Room,person?:Member){
  const key=threadKey(r.id,person?.id);
  if(!conversations.current[key]){
   conversations.current[key]=new Conversation([],person?1:8,async({messages,turn,round,signal})=>{
    const questionnaire=!!person&&messages.some(message=>message.role==='user'&&message.content.startsWith('/to-questionnaire'));
    try{
     const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({room:r.id,member:person?.id??null,mode:questionnaire?'questionnaire':'chat',turn,round,messages})});
     const payload=await res.json();
     if(!res.ok)throw new Error(payload&&typeof payload==='object'&&'error' in payload&&typeof payload.error==='string'?payload.error:'The agent service could not respond. Resume to retry.');
     const result=chatResponseSchema.parse(payload);
     const cast=person?[person]:teams[r.id];
     if(result.replies.some(reply=>!cast.some(member=>member.id===reply.memberId&&member.name===reply.speaker)))throw new Error('Invalid agent identity returned by the server.');
     setLive(true);return result;
    }catch(error){
     if(!signal.aborted)setLive(false);
     throw error;
    }
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
 <div className="workspace"><header><div className="wordmark">idea<span>quest</span><span className="alpha">EARLY ACCESS</span></div><div className="header-right"><ThemeSelector/><span className="profile small">T</span></div></header>
 <div className="page-heading"><div><div className="eyebrow">Click to wander. Choose a room. Meet six minds that think differently to brainstrom ideas.</div><h1>{tab==='notes'?'Your idea notebook.':'Who’s on your next idea team?'}</h1></div><div className="visited"><Sparkles size={15}/><b>{visited.length}<span> / 7</span></b><span>rooms explored</span></div></div>
 {tab==='notes'?<div className="notebook"><button className="back" onClick={()=>setTab('world')}><ArrowLeft size={16}/> Back to the clubhouse</button>{notes.length===0?<div className="empty-notes"><BookOpen size={36}/><h2>A place for your next big thing.</h2><p>Enter a room and save a conversation to keep it here for this visit.</p></div>:notes.map((n,i)=><article key={i}><h2>{n.room}<button onClick={()=>download(n.text,`idea-quest-${i+1}.md`)}><Download size={18}/> Export</button></h2><pre>{n.text}</pre></article>)}</div>:
 <div className="main-grid"><section className="world"><div className="world-title"><div><span className="tiny-square"/> THE CLUBHOUSE <span className="floor">/ FLOOR 01</span></div><span>7 rooms · 42 personalities</span></div>
 <div className="map-wrap"><img className="map-image" src="/assets/clubhouse.png" alt="Pixel-art clubhouse with seven creative team rooms"/><World onEnter={id=>{const r=rooms.find(r=>r.id===id);if(r)enter(r);}} onArrive={arrive} onSelectMember={(r,person)=>setProfile({room:r,person})}/><div className="map-shade"/>
 {rooms.map((r,i)=>{const Icon=icons[r.icon];return <div key={r.id} className={`map-team ${active?.id===r.id?'chosen':''}`} style={{left:`${r.x}%`,top:`${r.y-6}%`,'--room':r.color} as React.CSSProperties}><button className={`room-pin ${active?.id===r.id?'chosen':''}`} onClick={()=>enter(r)} aria-label={`Join the ${r.short} team`}><span className="pin-number">0{i+1}</span><Icon size={13}/><span>{r.short}</span></button></div>})}
 <div className="map-caption" aria-live="polite"><span className="live-dot"/>{walkingTo?`Walking to ${walkingTo.short}…`:moving?'On the move…':active?`${active.short} room · six personalities`:'The commons · choose any room'}</div></div>
 <div className="world-controls"><span><MousePointer2 size={14}/> Click floor to walk · hold + drag to guide</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>↵</kbd> join nearby room</span></div>
 <div className="room-strip">{rooms.map(r=>{const Icon=icons[r.icon];return <button key={r.id} className={active?.id===r.id?'active':''} onClick={()=>enter(r)}><Icon size={18} style={{color:r.color}}/><span>{r.short}</span></button>})}</div></section>
 <aside className="chat-panel" style={{'--accent':active?.color||'#c4b0f0'} as React.CSSProperties}>
 {active?<><div className="chat-heading"><div className="host-avatar"><Users size={24}/></div><div><h2>{active.name}<span>ROOM DISCUSSION · 6 + YOU</span></h2><p>{active.short} · Six tastes. One shared conversation.</p></div><button title="Return to commons" aria-label="Return to commons" onClick={leave}><X size={18}/></button></div>
 <ConversationPanel key={active.id} engine={discussion(active)} room={active} live={live} onProfile={person=>setProfile({room:active,person})} onSave={text=>save(active,text)} onQuestionnaire={()=>{const person=teams[active.id][0];setPrivateChat({room:active,person});discussion(active,person).enqueue('/to-questionnaire: Help me prepare questions for someone else.',person.name);}}/></>:
 <><div className="welcome-top"><span className="room-tag">YOU’RE IN THE COMMONS</span><h2>Choose your room.</h2><p>Six personalities are waiting in every room.<br/>Where do you want to take your idea?</p></div>
 {walkingTo&&<div className="walking-status" role="status"><span>Walking to {walkingTo.name}…</span><button onClick={()=>useWorldStore.getState().moveTo(null)}>Cancel</button></div>}
 <div className="room-chooser">{rooms.map(r=>{const Icon=icons[r.icon];return <button key={r.id} onClick={()=>enter(r)}><span className="chooser-icon" style={{background:r.color}}><Icon size={20}/></span><span><b>{r.short}</b><small>{teams[r.id].map(m=>m.name).join(', ')}</small></span><ArrowUpRight size={16}/></button>})}</div>
 <div className="welcome-note"><MousePointer2 size={17}/><span>Click the floor to explore freely.<br/>Join a room to listen, debate, and shape the idea.</span></div>{!live&&<div className="demo-note">Live chat is currently unavailable. Please try again shortly.</div>}</>}
 </aside></div>}
 <footer><span><span className="footer-star">✦</span> YOUR IDEA. YOUR TEAM. YOUR CALL.</span><span>Six minds. Different tastes. One shared conversation.</span><span>IDEA QUEST <b>v0.4</b></span></footer></div>
 <Dialog open={!!profile} onOpenChange={open=>{if(!open)setProfile(null);}}><DialogContent className="personality-dialog">{profile&&<><div className="personality-identity"><span className="portrait" style={{background:profile.person.color}}>{profile.person.avatar}</span><div><span className="profile-room">{profile.room.short}</span><DialogTitle>{profile.person.name}</DialogTitle><DialogDescription>{profile.person.archetype}</DialogDescription></div></div><div className="trait-tags">{profile.person.traits.map(t=><span key={t}>{t}</span>)}</div><blockquote>“{profile.person.belief}”</blockquote><dl><dt>Core expertise</dt><dd>{profile.person.primarySkill}</dd><dt>Drawn to</dt><dd>{profile.person.taste}</dd><dt>Pushes back on</dt><dd>{profile.person.dislikes}</dd><dt>Blind spot</dt><dd>{profile.person.blindSpot}</dd></dl><div className="profile-skills">Every personality uses grill-me and grilling. Exa research is available when configured.</div><div className="profile-actions"><button onClick={()=>{const p=profile;setProfile(null);enter(p.room);}}><Users size={16}/> Join room discussion</button><button className="private-action" onClick={()=>{const p=profile;setProfile(null);setPrivateChat(p);}}><Lock size={15}/> Talk privately</button></div></>}</DialogContent></Dialog>
 <Dialog open={!!privateChat} onOpenChange={open=>{if(!open)setPrivateChat(null);}}><DialogContent className="private-chat-dialog">{privateChat&&<><div className="private-heading"><span className="portrait" style={{background:privateChat.person.color}}>{privateChat.person.avatar}</span><div><DialogTitle>{privateChat.person.name}</DialogTitle><DialogDescription>{privateChat.person.archetype} · {privateChat.room.name}</DialogDescription></div></div><div className="privacy-note"><Lock size={12}/> Just you and {privateChat.person.name}. The room discussion stays separate.</div><ConversationPanel key={threadKey(privateChat.room.id,privateChat.person.id)} engine={discussion(privateChat.room,privateChat.person)} room={privateChat.room} person={privateChat.person} live={live} onProfile={()=>{}} onSave={text=>{save(privateChat.room,text,privateChat.person);setPrivateChat(null);}}/></>}</DialogContent></Dialog>
 </main>;
}
