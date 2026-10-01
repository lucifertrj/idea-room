import {getMembers} from '../../../lib/teams';
import {chatResponseSchema} from '../../../lib/chat-protocol';
import {z} from 'zod';
import {env} from 'cloudflare:workers';

const requestSchema=z.object({
 room:z.string(),turn:z.number().int().min(0).max(7),round:z.number().int().min(0).max(10000),
 member:z.string().min(1).nullable().optional(),mode:z.enum(['chat','questionnaire']).optional(),
 messages:z.array(z.object({
  role:z.enum(['user','assistant']),content:z.string().min(1).max(8000),
  speaker:z.string().max(40).optional(),memberId:z.string().max(40).optional(),
  target:z.string().max(40).optional(),id:z.string().max(100).optional(),
 })).min(1).max(160),
});

export async function GET(){
 const config=env as unknown as Record<string,string>;
 if(!config.AGNO_API_URL||!config.AGNO_API_TOKEN)return Response.json({live:false,error:'Agno backend is not configured.'});
 try{
  const response=await fetch(`${config.AGNO_API_URL.replace(/\/$/,'')}/health`,{headers:{Authorization:`Bearer ${config.AGNO_API_TOKEN}`},signal:AbortSignal.timeout(5000)});
  const health=await response.json() as {ready?:boolean;dialogue_protocol?:number};
  return Response.json({live:response.ok&&health.ready===true&&health.dialogue_protocol===5});
 }catch{return Response.json({live:false,error:'Agno backend is unavailable.'});}
}

export async function POST(request:Request){
 let input:unknown;
 try{input=await request.json();}catch{return Response.json({error:'Invalid conversation.'},{status:400});}
 const parsed=requestSchema.safeParse(input);
 if(!parsed.success)return Response.json({error:'Invalid conversation.'},{status:400});
 const data=parsed.data;
 const members=getMembers(data.room,data.member);
 if(!members.length)return Response.json({error:'Unknown room or specialist.'},{status:400});
 const config=env as unknown as Record<string,string>;
 if(!config.AGNO_API_URL||!config.AGNO_API_TOKEN)return Response.json({error:'Agno backend is not configured. Start the backend and configure AGNO_API_URL and AGNO_API_TOKEN.'},{status:503});
 try{
  const response=await fetch(`${config.AGNO_API_URL.replace(/\/$/,'')}/chat`,{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.AGNO_API_TOKEN}`},
   body:JSON.stringify(data),signal:AbortSignal.any([request.signal,AbortSignal.timeout(55000)]),
  });
  if(!response.ok){
   const error=response.status===503?'The backend is missing required configuration. Check its OpenAI key and service token.':response.status===401?'The frontend and backend service tokens do not match.':response.status===504?'The agent request timed out. Resume to retry.':'The agent service could not respond. Check backend logs and resume to retry.';
   return Response.json({error},{status:response.status===503?503:response.status===504?504:502});
  }
  const output=chatResponseSchema.safeParse(await response.json());
  if(!output.success||output.data.replies.some(reply=>!members.some(member=>member.id===reply.memberId&&member.name===reply.speaker))){
   return Response.json({error:'Invalid agent response or incompatible backend. Update and restart the backend.'},{status:502});
  }
  return Response.json(output.data);
 }catch{return Response.json({error:'Cannot reach the Agno backend, or the request timed out. Start the backend and resume to retry. Your messages are kept.'},{status:502});}
}
