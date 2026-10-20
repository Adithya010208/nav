import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {limitedBytes} from '@/lib/http';
import {deviceJSON as json,newDeviceToken,tokenHash} from '@/lib/devices';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);if(!env.DB)return json({error:'Database unavailable.'},503);
 try{const rows=await env.DB.prepare('SELECT id,label,group_name,expires_at,revoked,last_seen_at FROM devices WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.userId).all();return json({devices:rows.results});}catch{return json({error:'Devices could not be loaded.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);if(!env.DB)return json({error:'Database unavailable.'},503);
 let body;try{body=JSON.parse(new TextDecoder().decode(await limitedBytes(request,2000)));if(typeof body.label!=='string'||!body.label.trim()||body.label.length>80||body.confirm!==true)throw Error();}catch{return json({error:'Enter a device label and confirm selected-group sync.'},400);}
 try{
  const row=await env.DB.prepare('SELECT payload FROM workspaces WHERE user_id=?').bind(user.userId).first<{payload:string}>();const group=row?JSON.parse(row.payload).profile?.approvedGroup:'';if(typeof group!=='string'||!group.trim())return json({error:'Save your exact approved college group in Settings first.'},400);
  const id=crypto.randomUUID(),token=newDeviceToken(),hash=await tokenHash(token),now=new Date().toISOString(),expires=new Date(Date.now()+30*86400000).toISOString();
  const created=await env.DB.prepare('INSERT INTO devices (id,user_id,label,group_name,token_hash,created_at,expires_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM devices WHERE user_id=? AND revoked=0 AND expires_at>?)<5 RETURNING id').bind(id,user.userId,body.label.trim(),group,hash,now,expires,user.userId,now).first();
  if(!created)return json({error:'Five active devices already exist. Revoke an unused device first.'},409);
  return json({id,token,group,expiresAt:expires,scope:'Append notices from this exact group only; no task changes or workspace reads.'},201);
 }catch{return json({error:'Device could not be created.'},503);}
}
export async function DELETE(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);if(!env.DB)return json({error:'Database unavailable.'},503);
 let id;try{const b=JSON.parse(new TextDecoder().decode(await limitedBytes(request,1000)));if(typeof b.id!=='string'||b.id.length>100)throw Error();id=b.id;}catch{return json({error:'Choose a device.'},400);}
 try{const row=await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=? AND user_id=? RETURNING id').bind(id,user.userId).first();return row?json({revoked:true}):json({error:'Device not found.'},404);}catch{return json({error:'Device could not be revoked.'},503);}
}
