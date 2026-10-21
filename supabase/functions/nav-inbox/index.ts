declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
// Simple eq filters take literal values; URI encoding keeps each value in its own parameter.
const filterValue=(value:string)=>encodeURIComponent(value);
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function body(request:Request){const reader=request.body?.getReader();let text='',bytes=0;const decoder=new TextDecoder();if(reader)while(true){const value=await reader.read();if(value.done)break;bytes+=value.value.length;if(bytes>500000){await reader.cancel();throw Error();}text+=decoder.decode(value.value,{stream:true});}return JSON.parse(text+decoder.decode());}
async function db(path:string,method='GET',payload?:unknown){
 const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
 const key=modern||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw Error();
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',Prefer:'return=representation'};if(!modern)headers.Authorization='Bearer '+key;
 const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/'+path,{method,headers,redirect:'error',signal:AbortSignal.timeout(10000),...(payload===undefined?{}:{body:JSON.stringify(payload)})});if(!response.ok)throw Error();return response.status===204?null:await response.json();
}
export async function handler(request:Request):Promise<Response>{
 if(request.method!=='POST')return json({error:'POST required.'},405);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^nav[ds]_[a-f0-9]{64}$/.test(token))return json({error:'Credential required.'},401);
 try{
  const tokenHash=await hash(token),op=new URL(request.url).searchParams.get('op')||'upload';
  if(op==='upload'){
   if(!token.startsWith('navd_'))return json({error:'Device credential required.'},401);
   let payload;try{payload=await body(request);}catch{return json({error:'Invalid bounded JSON bundle.'},400);}
   const result=await db('rpc/nav_ingest','POST',{p_token_hash:tokenHash,p_payload:payload});if(!result||typeof result!=='object'||!('status' in result)||typeof result.status!=='number'||!Number.isInteger(result.status)||result.status<200||result.status>599)throw Error();const {status,...reply}=result;return json(reply,status);
  }
  if(!token.startsWith('navs_'))return json({error:'Server credential required.'},401);
  const authorized=await db('nav_server_keys?token_hash=eq.'+tokenHash+'&enabled=eq.true&select=token_hash&limit=1');if(!Array.isArray(authorized)||authorized.length!==1)return json({error:'Server credential invalid.'},401);
  let value;try{value=await body(request);}catch{return json({error:'Invalid bounded JSON.'},400);}
  if(op==='register'){
   const records=value.devices;if(!Array.isArray(records)||records.length>100)return json({error:'Invalid devices.'},400);
   for(const d of records)if(!/^[a-f0-9]{64}$/.test(d.token_hash)||typeof d.user_id!=='string'||d.user_id.length>300||typeof d.group_name!=='string'||d.group_name.length<1||d.group_name.length>150||!Number.isFinite(Date.parse(d.expires_at))||typeof d.revoked!=='boolean'||!/^[a-f0-9-]{36}$/.test(d.id))return json({error:'Invalid device record.'},400);
   // Token hash is immutable. Existing IDs are never assigned to another owner.
   for(const d of records){const existing=await db('nav_devices?id=eq.'+d.id+'&select=user_id,token_hash');if(!Array.isArray(existing))throw Error();if(existing.length&&(existing[0].user_id!==d.user_id||existing[0].token_hash!==d.token_hash))return json({error:'Device owner mismatch.'},409);if(existing.length)await db('nav_devices?id=eq.'+d.id,'PATCH',{revoked:d.revoked,expires_at:d.expires_at});else await db('nav_devices','POST',d);}
   return json({registered:records.length});
  }
  if(typeof value.userId!=='string'||value.userId.length<1||value.userId.length>300||typeof value.group!=='string'||value.group.length>150)return json({error:'Owner and group required.'},400);
  const owner=filterValue(value.userId),group=filterValue(value.group);
  if(op==='pull'){const notices=await db('nav_notices?user_id=eq.'+owner+'&group_name=eq.'+group+'&consumed_at=is.null&select=id,body,received_at&order=id.asc&limit=20');return json({notices});}
  if(op==='ack'){
   if(!Array.isArray(value.ids)||!value.ids.length||value.ids.length>100||!value.ids.every((n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0))return json({error:'Invalid acknowledgement.'},400);
   await db('nav_notices?user_id=eq.'+owner+'&group_name=eq.'+group+'&id=in.('+value.ids.join(',')+')','PATCH',{consumed_at:new Date().toISOString()});return json({acknowledged:true});
  }
  return json({error:'Unknown operation.'},404);
 }catch{return json({error:'Inbox temporarily unavailable. Retain local notices and retry.'},503);}
}
Deno.serve(handler);
