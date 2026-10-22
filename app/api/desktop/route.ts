import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {deviceJSON as json,newDeviceToken,tokenHash} from '@/lib/devices';
import {limitedBytes} from '@/lib/http';
import {desktopCall,desktopRelayURL,publishDesktop} from '@/lib/desktop-relay';
import {workspaceSchema} from '@/lib/validation';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);try{return json({connections:await desktopCall('list',user.userId)});}catch{return json({error:'Windows connections are unavailable.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 try{
  const b=JSON.parse(new TextDecoder().decode(await limitedBytes(request,2000)));if(b.confirm!==true||typeof b.label!=='string'||!b.label.trim()||b.label.length>80)return json({error:'Enter a label and approve reminder-only access.'},400);
  if(!env.DB)throw Error();const row=await env.DB.prepare('SELECT payload,revision FROM workspaces WHERE user_id=?').bind(user.userId).first<{payload:string;revision:number}>();if(!row)return json({error:'Save your plan first.'},400);const data=workspaceSchema.parse(JSON.parse(row.payload));
  const token=newDeviceToken().replace('navd_','navw_'),id=crypto.randomUUID();const result=await desktopCall('create',user.userId,{id,label:b.label.trim(),tokenHash:await tokenHash(token)});if(result.full)return json({error:'Revoke an unused Windows connection first (maximum five).'},409);
  const sync=await publishDesktop(user.userId,data,row.revision);if(sync!=='current'){await desktopCall('revoke',user.userId,{id});throw Error();}
  return json({format:'nav-windows-setup',version:1,deviceId:id,deviceToken:token,expiresAt:result.expiresAt,relayUrl:desktopRelayURL},201);
 }catch{return json({error:'Windows setup could not be created. Retry from Settings.'},503);}
}
export async function DELETE(request:Request){const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);try{const b=JSON.parse(new TextDecoder().decode(await limitedBytes(request,1000)));if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id))return json({error:'Choose a connection.'},400);return json(await desktopCall('revoke',user.userId,{id:b.id}));}catch{return json({error:'Revocation failed. Connection may remain active; retry.'},503);}}
