import {validReminderSnapshot,snapshotForProtocol} from '../_shared/reminder-protocol.ts';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function db(path:string,value?:unknown){const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default,key=modern||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw Error();const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/'+path,{method:value===undefined?'GET':'POST',headers:{apikey:key,'Content-Type':'application/json',...(!modern?{Authorization:'Bearer '+key}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();return r.json();}
async function bounded(request:Request){const reader=request.body?.getReader();if(!reader)throw Error();let bytes=0,text='';const decoder=new TextDecoder();while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>1250000){await reader.cancel();throw Error();}text+=decoder.decode(next.value,{stream:true});}return JSON.parse(text+decoder.decode());}
export const validSnapshot=validReminderSnapshot;
export async function handler(request:Request):Promise<Response>{
 if(request.method!=='POST')return json({error:'POST required.'},405);
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^nav[sw]_[a-f0-9]{64}$/.test(token))return json({error:'Credential required.'},401);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
 try{
  const hash=await digest(token),op=new URL(request.url).searchParams.get('op');
  if(token.startsWith('navw_')){
   if(op!=='read')return json({error:'Read-only credential.'},403);
   const rows=await db('nav_desktop_links?token_hash=eq.'+hash+'&revoked=eq.false&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=id,user_id,expires_at&limit=1');if(!Array.isArray(rows)||rows.length!==1)return json({error:'Connection expired or revoked.'},401);
   const snapshots=await db('nav_reminder_snapshots?user_id=eq.'+encodeURIComponent(rows[0].user_id)+'&select=payload,revision,updated_at&limit=1');if(!Array.isArray(snapshots)||snapshots.length!==1||!validSnapshot(snapshots[0].payload))return json({error:'Open NAV in your browser to synchronize your plan.'},409);
   return json({scope:rows[0].id,data:snapshotForProtocol(snapshots[0].payload,request.headers.get('X-NAV-Reminder-Protocol')),revision:snapshots[0].revision,updatedAt:snapshots[0].updated_at,expiresAt:rows[0].expires_at});
  }
  const keys=await db('nav_server_keys?token_hash=eq.'+hash+'&enabled=eq.true&select=token_hash&limit=1');if(!Array.isArray(keys)||keys.length!==1)return json({error:'Invalid server credential.'},401);
  let b;try{b=await bounded(request);}catch{return json({error:'Invalid bounded JSON.'},400);}
  if(typeof b.userId!=='string'||!b.userId.length||b.userId.length>300||!['list','create','revoke','publish'].includes(op||''))return json({error:'Invalid owner or operation.'},400);
  const v=b.value||{};
  if(op==='create'&&(!/^[a-f0-9-]{36}$/.test(v.id)||!/^[a-f0-9]{64}$/.test(v.tokenHash)||typeof v.label!=='string'||!v.label.trim()||v.label.length>80))return json({error:'Invalid connection.'},400);
  if(op==='revoke'&&!/^[a-f0-9-]{36}$/.test(v.id))return json({error:'Invalid connection.'},400);
  if(op==='publish'&&(!Number.isSafeInteger(v.revision)||v.revision<0||!validSnapshot(v.data)))return json({error:'Invalid reminder snapshot.'},400);
  return json(await db('rpc/nav_desktop_manage',{p_op:op,p_owner:b.userId,p_value:v}));
 }catch{return json({error:'Reminder service temporarily unavailable.'},503);}
}
Deno.serve(handler);
