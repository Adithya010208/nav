import {env} from 'cloudflare:workers';
import {limitedBytes} from './http';
import {desktopSnapshot} from './desktop-snapshot';
import type {Workspace} from './model';
export const mobileRelayURL='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-phone-reminders';
export async function mobileCall(op:string,userId:string,value:unknown={},timeout=12000){
 if(!env.NAV_RELAY_SERVER_KEY)throw Error('Reminder service unavailable.');
 const response=await fetch(mobileRelayURL+'?op='+op,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.NAV_RELAY_SERVER_KEY},body:JSON.stringify({userId,value}),redirect:'manual',signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('Phone reminder connection unavailable.');return JSON.parse(new TextDecoder().decode(await limitedBytes(response,1250000)));
}
export async function publishMobile(userId:string,data:Workspace,revision:number){
 try{
  const links=await mobileCall('list',userId,{},2500);
  if(!Array.isArray(links))throw Error();
  if(!links.some(l=>l&&l.revoked===false&&Date.parse(l.expiresAt)>Date.now()))return 'not_connected';
  await mobileCall('publish',userId,{revision,data:desktopSnapshot(data,env.NAV_ADVANCED_REMINDERS_READY==='v2')},2500);return 'current';
 }catch{return 'retry';}
}
