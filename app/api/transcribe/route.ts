import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {limitedBytes} from '@/lib/http';
import {providerConfig,ProviderError} from '@/lib/ai-provider';
import {transcribe,VoiceLanguage} from '@/lib/transcription';
import {validateVoiceWav} from '@/lib/audio';
import {dateInZone} from '@/lib/model';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);const c=providerConfig(env);return json({configured:c.id==='gemini'&&c.configured,provider:'gemini',providerLabel:'Google Gemini',maxSeconds:30});}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 const config=providerConfig(env);if(config.id!=='gemini'||!config.configured)return json({error:'Google Gemini voice transcription is unavailable.'},503);
 if(!env.DB)return json({error:'Database unavailable.'},503);
 let bytes:Uint8Array,language:VoiceLanguage;
 try{
  const body=await limitedBytes(request,1000000),form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')||''},body}).formData();
  if(form.get('consent')!=='gemini-audio'||!['en-IN','ta-IN','hi-IN'].includes(String(form.get('language'))))return json({error:'Approve sharing this recording with Google Gemini and choose a speech language.'},400);
  language=String(form.get('language')) as VoiceLanguage;const file=form.get('audio');if(!file||typeof file==='string'||file.type!=='audio/wav')return json({error:'Record a question using NAV’s microphone control.'},400);
  bytes=new Uint8Array(await file.arrayBuffer());validateVoiceWav(bytes);
 }catch(e){const message=e instanceof Error?e.message:'';const safe=['Record a voice clip of up to 30 seconds.','Unsupported recording. Record again using NAV’s microphone control.','The recording is silent. Check the microphone and try again.'];return json({error:safe.includes(message)?message:message==='Request too large'?'Recording is too large. Keep it under 30 seconds.':'Invalid recording upload. Use NAV’s Record question control and retry.'},400);}
 try{
  const profile=await env.DB.prepare("SELECT json_extract(payload,'$.profile.timezone') AS timezone FROM workspaces WHERE user_id=?").bind(user.userId).first<{timezone:string}>();
  const day=dateInZone(profile?.timezone||'Asia/Kolkata');const usage=await env.DB.prepare('INSERT INTO ai_usage (user_id,day,count) VALUES (?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<20 RETURNING count').bind(user.userId,day).first<{count:number}>();
  if(!usage)return json({error:'Daily AI limit reached (20 combined AI and voice requests). Try tomorrow.'},429);
  const transcript=await transcribe(config,bytes,language,request.signal);return json({transcript});
 }catch(e){return json({error:e instanceof ProviderError?e.message:'Voice transcription failed. Nothing was submitted. Retry or type your question.'},e instanceof ProviderError?e.status:502);}
}
