import { rooms } from '../../../lib/rooms';
import { getMembers } from '../../../lib/teams';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
export async function GET(){const e=env as unknown as Record<string,string>;if(!e.AGNO_API_URL||!e.AGNO_API_TOKEN)return Response.json({live:false});try{const r=await fetch(`${e.AGNO_API_URL.replace(/\/$/,'')}/health`,{headers:{Authorization:`Bearer ${e.AGNO_API_TOKEN}`},signal:AbortSignal.timeout(5000)});const d=await r.json() as {ready:boolean;team_chat?:boolean;dialogue_protocol?:number};return Response.json({live:r.ok&&d.ready&&d.dialogue_protocol===4});}catch{return Response.json({live:false});}}
export async function POST(req:Request){
 try {
  const parsed=z.object({room:z.string(),turn:z.number().int().min(0).max(7),round:z.number().int().min(0).max(10000),member:z.string().nullable().optional(),mode:z.enum(['chat','questionnaire']).optional(),messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(8000),speaker:z.string().max(40).optional(),memberId:z.string().max(40).optional(),target:z.string().max(40).optional(),id:z.string().max(100).optional()})).min(1).max(160)}).safeParse(await req.json());
  if(!parsed.success)return Response.json({error:'Invalid conversation.'},{status:400});
  const data=parsed.data;
  if(data.member&&!getMembers(data.room,data.member).length)return Response.json({error:'That specialist does not belong to this room.'},{status:400});
  if(!rooms.some(r=>r.id===data.room)||!Array.isArray(data.messages)||data.messages.length>160||data.messages.some((m:any)=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>8000)) return Response.json({error:'Invalid conversation.'},{status:400});
  const e=env as unknown as Record<string,string>;
  if(!e.AGNO_API_URL||!e.AGNO_API_TOKEN)return Response.json({error:'Live agents are not connected. Use the guided demo for now.'},{status:503});
  const result=await fetch(`${e.AGNO_API_URL.replace(/\/$/,'')}/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${e.AGNO_API_TOKEN}`},body:JSON.stringify(data),signal:AbortSignal.timeout(55000)});
  if(!result.ok)return Response.json({error:'The room host could not respond. Please try again.'},{status:502});
  const output=await result.json() as {replies?:{role:string;content:string;speaker:string;memberId:string}[]};
  if(!Array.isArray(output.replies)||!output.replies.length)return Response.json({error:'The agent service needs the team-chat update.'},{status:502});
  return Response.json({replies:output.replies});
 }catch{return Response.json({error:'The room connection timed out. Your conversation is still here.'},{status:502});}
}
