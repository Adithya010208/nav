import {env} from 'cloudflare:workers';
import {limitedBytes} from './http';
import {desktopSnapshot} from './desktop-snapshot';
import type {Workspace} from './model';
export const desktopRelayURL='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-desktop';
export async function desktopCall(op:string,userId:string,value:unknown={},timeout=12000){
 if(!env.NAV_RELAY_SERVER_KEY)throw Error('Reminder service unavailable.');
 const response=await fetch(desktopRelayURL+'?op='+op,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.NAV_RELAY_SERVER_KEY},body:JSON.stringify({userId,value}),redirect:'error',signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('Reminder connection unavailable.');return JSON.parse(new TextDecoder().decode(await limitedBytes(response,1250000)));
}
export async function publishDesktop(userId:string,data:Workspace,revision:number){
 try{
  // Never transmit reminder details until this owner explicitly created a live connection.
  const links=await desktopCall('list',userId,{},2500);
  if(!Array.isArray(links))throw Error();
  if(!links.some(l=>l&&l.revoked===false&&Date.parse(l.expiresAt)>Date.now()))return 'not_connected';
  await desktopCall('publish',userId,{revision,data:desktopSnapshot(data)},2500);return 'current';
 }catch{return 'retry';}
}
