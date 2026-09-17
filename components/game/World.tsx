'use client';
import {useEffect,useRef} from 'react';
import {findPath,walkable} from '../../lib/navigation';
import {rooms} from '../../lib/rooms';
import {useWorldStore} from '../../lib/world-store';

export default function World({onEnter,onArrive}:{onEnter:(id:string)=>void;onArrive:(id:string,member?:string)=>void}){
 const parent=useRef<HTMLDivElement>(null),enterRef=useRef(onEnter),arriveRef=useRef(onArrive);
 enterRef.current=onEnter;arriveRef.current=onArrive;
 useEffect(()=>{
  let destroyed=false,game:import('phaser').Game|undefined,unsub:(()=>void)|undefined;
  const pressed=new Set<string>();
  const keydown=(e:KeyboardEvent)=>{
   if(document.querySelector('[role="dialog"]'))return;
   if(e.target instanceof HTMLElement&&(e.target.closest('input,textarea,[contenteditable="true"]')))return;
   if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();pressed.add(e.key);}
   if(e.key==='Enter'&&!(e.target instanceof HTMLElement&&e.target.closest('button'))){const p=useWorldStore.getState().position;const r=rooms.find(r=>Math.hypot(r.x-p.x,r.y-p.y)<14);if(r){e.preventDefault();enterRef.current(r.id);}}
  };
  const keyup=(e:KeyboardEvent)=>pressed.delete(e.key),blur=()=>pressed.clear();
  import('phaser').then(({default:P})=>{
   if(destroyed||!parent.current)return;
   class Clubhouse extends P.Scene{
    player!:import('phaser').GameObjects.Image;label!:import('phaser').GameObjects.Text;cursor!:import('phaser').GameObjects.Arc;marker!:import('phaser').GameObjects.Arc;trail!:import('phaser').GameObjects.Graphics;
    path:{x:number;y:number}[]=[];tick=0;lastDrag=0;arrival:{roomId?:string;memberId?:string}|null=null;
    preload(){this.load.image('map','/assets/clubhouse.png');this.load.image('player','/assets/player.png');}
    create(){
     this.game.canvas.tabIndex=0;
     this.add.image(768,512,'map').setDisplaySize(1536,1024);
     this.trail=this.add.graphics();this.marker=this.add.circle(0,0,10,0xd9c3fb,.25).setStrokeStyle(2,0xeedfff).setVisible(false);
     this.cursor=this.add.circle(0,0,12,0xc7e8cb,.2).setStrokeStyle(2,0xd7edc9).setVisible(false);
     const p=useWorldStore.getState().position;
     this.player=this.add.image(p.x*15.36,p.y*10.24,'player').setDisplaySize(96,100).setOrigin(.5,.88);
     this.label=this.add.text(0,0,'YOU',{fontFamily:'monospace',fontSize:'13px',color:'#fff',backgroundColor:'#76638f',padding:{x:7,y:4}}).setOrigin(.5,1);
     this.label.setPosition(this.player.x,this.player.y-65);
     const go=()=>{
      const d=useWorldStore.getState().destination;
      if(d?.roomId)this.game.canvas.focus({preventScroll:true});
      if(!d){this.path=[];this.arrival=null;this.marker.setVisible(false);this.trail.clear();useWorldStore.getState().setMoving(false);return;}
      this.path=findPath(useWorldStore.getState().position,d.point);this.arrival=d;
      this.marker.setPosition(d.point.x*15.36,d.point.y*10.24).setVisible(true);this.trail.clear();
      this.trail.fillStyle(0xe9d4ff,.65);this.path.forEach((p,i)=>{if(i%3===0)this.trail.fillCircle(p.x*15.36,p.y*10.24,2);});
      if(!this.path.length)this.finish();else useWorldStore.getState().setMoving(true);
     };
     unsub=useWorldStore.subscribe((s,prev)=>{if(s.destination!==prev.destination)go();});go();
     const target=(pointer:import('phaser').Input.Pointer)=>{this.game.canvas.focus({preventScroll:true});const x=pointer.x/15.36,y=pointer.y/10.24;if(walkable(x,y))useWorldStore.getState().moveTo({point:{x:Math.round(x),y:Math.round(y)}});};
     this.input.on('pointerdown',target);
     this.input.on('pointermove',(pointer:import('phaser').Input.Pointer)=>{
      const valid=walkable(pointer.x/15.36,pointer.y/10.24);this.cursor.setPosition(pointer.x,pointer.y).setStrokeStyle(2,valid?0xd7edc9:0xdc989f).setFillStyle(valid?0xc7e8cb:0xdc989f,.2).setVisible(true);
      if(pointer.isDown&&this.time.now-this.lastDrag>100){this.lastDrag=this.time.now;target(pointer);}
     });
     this.input.on('gameout',()=>this.cursor.setVisible(false));
    }
    finish(){const arrival=this.arrival;this.arrival=null;this.path=[];this.marker.setVisible(false);this.trail.clear();useWorldStore.getState().moveTo(null);if(arrival?.roomId)arriveRef.current(arrival.roomId,arrival.memberId);}
    update(_time:number,delta:number){
     if(!this.player)return;
     let {x,y}=useWorldStore.getState().position;
     const dx=(pressed.has('d')||pressed.has('ArrowRight')?1:0)-(pressed.has('a')||pressed.has('ArrowLeft')?1:0),dy=(pressed.has('s')||pressed.has('ArrowDown')?1:0)-(pressed.has('w')||pressed.has('ArrowUp')?1:0);
     const step=Math.min(delta,40)*.026;let moving=false;
     if(dx||dy){if(this.arrival||this.path.length)useWorldStore.getState().moveTo(null);const length=Math.hypot(dx,dy);if(walkable(x+dx/length*step,y)){x+=dx/length*step;moving=!!dx;}if(walkable(x,y+dy/length*step)){y+=dy/length*step;moving=moving||!!dy;}this.player.setFlipX(dx<0);}
     else if(this.path.length){const target=this.path[0],dist=Math.hypot(target.x-x,target.y-y);if(dist<=step){x=target.x;y=target.y;this.path.shift();}else{x+=(target.x-x)/dist*step;y+=(target.y-y)/dist*step;}this.player.setFlipX(target.x<x);moving=true;}
     if(moving){this.tick+=delta;useWorldStore.getState().setPosition({x,y});}
     this.player.setPosition(x*15.36,y*10.24+(moving?Math.sin(this.tick*.018)*2:0));this.label.setPosition(this.player.x,this.player.y-65);
     if(useWorldStore.getState().moving!==moving)useWorldStore.getState().setMoving(moving);
     if(this.arrival&&!this.path.length)this.finish();
    }
   }
   game=new P.Game({type:P.AUTO,parent:parent.current,width:1536,height:1024,pixelArt:true,transparent:true,scene:Clubhouse,scale:{mode:P.Scale.FIT,autoCenter:P.Scale.CENTER_BOTH},audio:{noAudio:true},banner:false});
   window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  });
  return()=>{destroyed=true;unsub?.();game?.destroy(true);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);};
 },[]);
 return <div ref={parent} className="phaser-world" role="img" aria-label="Click a floor to walk there, or hold and drag to guide your character. Select a room sign or team member to join a conversation."/>;
}
