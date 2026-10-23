import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {limitedBytes} from '@/lib/http';
import {aiInput,aiOutput,aiContext,instructions} from '@/lib/ai';
import {providerConfig,providerAdvice,ProviderError} from '@/lib/ai-provider';
import {Workspace,dateInZone} from '@/lib/model';
import {coordinatedAdvice} from '@/lib/agents';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);const config=providerConfig(env);return json({configured:config.configured,provider:config.id,providerLabel:config.label,model:config.model});}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 const config=providerConfig(env);if(!config.configured)return json({error:'Generative AI is not connected. Configure a private server API credential.'},503);
 if(!env.DB)return json({error:'Database unavailable.'},503);
 let input;try{input=aiInput.safeParse(JSON.parse(new TextDecoder().decode(await limitedBytes(request,12000))));}catch{return json({error:'Enter a valid question and sharing consent.'},400);}
 if(!input.success)return json({error:'Enter a question and consent to share the selected context with the displayed AI provider.'},400);
 if(input.data.provider!==config.id)return json({error:'The AI provider changed. Refresh and review the new sharing details before asking.'},409);
 try{
  const row=await env.DB.prepare('SELECT payload FROM workspaces WHERE user_id=?').bind(user.userId).first<{payload:string}>();if(!row)return json({error:'Set up your workspace first.'},400);
  const w=JSON.parse(row.payload) as Workspace;if(input.data.mode==='college'&&(!input.data.sourceId||!w.sources.some(s=>s.id===input.data.sourceId)))return json({error:'Select a saved source message for college analysis.'},400);
  const day=dateInZone(w.profile.timezone),cost=input.data.coordinate&&!input.data.connectionTest?2:1;const usage=await env.DB.prepare('INSERT INTO ai_usage (user_id,day,count) VALUES (?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET count=count+excluded.count WHERE count+excluded.count<=20 RETURNING count').bind(user.userId,day,cost).first<{count:number}>();if(!usage)return json({error:'Daily AI limit reached (20 requests). Try again tomorrow.'},429);
  const result=await coordinatedAdvice(config,input.data.mode,{today:day,question:input.data.connectionTest?'Explain an array in two sentences. Return no task suggestions.':input.data.question,context:input.data.connectionTest?{tasks:[],milestones:[],recentPractice:[],recentFocus:[]}:aiContext(w,input.data.mode,input.data.sourceId,new Date(),input.data.includeMemory?input.data.question:undefined)},input.data.coordinate&&!input.data.connectionTest);
  const output=aiOutput.safeParse(result);if(!output.success)return json({error:'AI output failed validation. Nothing was applied.'},502);
  return json({...output.data,agents:result.agents,sourceId:input.data.mode==='college'?input.data.sourceId:null});
 }catch(error){return json({error:error instanceof ProviderError?error.message:'AI request could not be completed. Nothing was applied.'},error instanceof ProviderError?error.status:502);}
}
