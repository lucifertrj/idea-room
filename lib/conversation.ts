import type {Message} from './rooms';
export type TurnRequest={messages:Message[];turn:number;round:number;signal:AbortSignal};
export type TurnResult={replies:Message[];done:boolean;routing:{reason:string}};
export type ConversationState={messages:Message[];queue:Message[];busy:boolean;paused:boolean;turn:number;round:number;error:string;routingReason:string};
/** One worker per thread. Queued messages enter the transcript only at turn boundaries. */
export class Conversation {
 private listeners=new Set<()=>void>();
 private controller:AbortController|null=null;
 private remaining=0;
 private state:ConversationState;
 constructor(private initial:Message[],private roundLength:number,private respond:(request:TurnRequest)=>Promise<TurnResult>){
  this.state={messages:initial,queue:[],busy:false,paused:false,turn:0,round:0,error:'',routingReason:''};
 }
 snapshot=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(patch:Partial<ConversationState>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}
 enqueue(text:string,target:string){
  if(!text.trim())return false;
  if(text.trim().length>8000){this.update({error:'Messages must be 8,000 characters or fewer.'});return false;}
  if(this.state.queue.length>=20){this.update({error:'Queue is full. Wait for a turn before adding more.'});return false;}
  this.update({queue:[...this.state.queue,{id:crypto.randomUUID(),role:'user',content:text.trim(),target}],error:''});
  if(!this.state.busy&&!this.state.paused)void this.run();
  return true;
 }
 reset(){if(this.state.busy)return;this.remaining=0;this.update({messages:this.initial,queue:[],busy:false,paused:false,turn:0,round:0,error:'',routingReason:''});}
 cancel(id:string){this.update({queue:this.state.queue.filter(m=>m.id!==id)});}
 pause(){this.update({paused:true});this.controller?.abort();}
 resume(){if(this.state.busy||(!this.remaining&&!this.state.queue.length))return;this.update({paused:false,error:''});void this.run();}
 private async run(){
  if(this.state.busy)return;
  const controller=new AbortController();this.controller=controller;
  this.update({busy:true,error:''});
  if(!this.remaining)this.remaining=this.roundLength;
  let calls=0;
  try{
   while(!controller.signal.aborted&&calls<24){
    const pending=this.state.queue;
    if(this.state.messages.length+pending.length>=150){this.update({paused:true,error:'This conversation is full. Save it and start a fresh discussion to keep every message intact.'});break;}
    if(pending.length){
     this.update({messages:[...this.state.messages,...pending],queue:[],turn:0});
     this.remaining=this.roundLength;
    }
    const result=await this.respond({messages:[...this.state.messages],turn:this.state.turn,round:this.state.round,signal:controller.signal});
    if(controller.signal.aborted)break;
    this.remaining--;calls++;
    if(result.done)this.remaining=0;
    const finished=!this.remaining;
    this.update({messages:[...this.state.messages,...result.replies],turn:finished?0:this.state.turn+1,round:this.state.round+(finished?1:0),routingReason:result.routing.reason});
    if(!this.remaining&&!this.state.queue.length)break;
   }
   if(calls===24&&(this.remaining||this.state.queue.length))this.update({paused:true,error:'Discussion paused after three rounds. Resume when you’re ready.'});
  }catch(error){if(!controller.signal.aborted)this.update({paused:true,error:(error as Error).message});}
  finally{this.controller=null;this.update({busy:false});}
 }
}
