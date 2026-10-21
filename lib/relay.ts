import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {limitedBytes} from './http';
import {workspaceSchema} from './validation';
import {mergeNoticeBundle,NoticeInboxFullError} from './notice-transfer';
export const relayURL='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-inbox';
export const relayConfigured=()=>!!env.NAV_RELAY_SERVER_KEY;
async function call(op:string,body:unknown){
 if(!env.NAV_RELAY_SERVER_KEY)throw Error('Managed inbox is not configured.');
 const response=await fetch(relayURL+'?op='+op,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.NAV_RELAY_SERVER_KEY},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Managed inbox unavailable.');return JSON.parse(new TextDecoder().decode(await limitedBytes(response,1200000)));
}
export async function registerRelayDevices(userId:string){
 if(!relayConfigured()||!env.DB)return;
 const rows=await env.DB.prepare('SELECT id,user_id,token_hash,group_name,expires_at,revoked FROM devices WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(userId).all<{id:string;user_id:string;token_hash:string;group_name:string;expires_at:string;revoked:number}>();
 await call('register',{devices:rows.results.map(d=>({...d,revoked:!!d.revoked}))});
}
const noticeRows=z.array(z.object({id:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),body:z.string().min(1).max(12000),received_at:z.number().int().nonnegative()})).max(20);
export async function consumeRelayInbox(userId:string):Promise<string>{
 if(!relayConfigured()||!env.DB)return 'not_configured';
 try{
  const row=await env.DB.prepare('SELECT payload,revision FROM workspaces WHERE user_id=?').bind(userId).first<{payload:string;revision:number}>();if(!row)return 'current';
  const parsed=workspaceSchema.safeParse(JSON.parse(row.payload));if(!parsed.success)return 'retry';const workspace=parsed.data,group=workspace.profile.approvedGroup;if(!group)return 'current';
  const reply=await call('pull',{userId,group}),rows=noticeRows.parse(reply.notices);if(!rows.length)return 'current';
  const existing=await env.DB.prepare('SELECT notice_id FROM relay_receipts WHERE user_id=?').bind(userId).all<{notice_id:string}>(),seen=new Set(existing.results.map(r=>r.notice_id));
  const acknowledgements:number[]=[],pending:typeof rows=[];let bytes=0;const cutoff=Date.now()-7*86400000;
  for(const row of rows){if(seen.has(String(row.id))||row.received_at<cutoff){acknowledgements.push(row.id);continue;}const size=new TextEncoder().encode(row.body).length+300;if(bytes+size>450000)break;bytes+=size;pending.push(row);}
  if(pending.length){
   const merged=mergeNoticeBundle(workspace,{format:'nav-college-notices',version:1,group,notices:pending.map(n=>({group,text:n.body,receivedAt:n.received_at}))});const payload=JSON.stringify(merged.workspace);
   if(!workspaceSchema.safeParse(merged.workspace).success||new TextEncoder().encode(payload).length>1800000)return 'full';
   const now=new Date().toISOString();
   // Receipts and payload share one atomic D1 batch. A stale revision inserts neither.
   const statements=pending.map(n=>env.DB!.prepare('INSERT OR IGNORE INTO relay_receipts(user_id,notice_id,received_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspaces WHERE user_id=? AND revision=?)').bind(userId,String(n.id),n.received_at,userId,row.revision));
   statements.push(env.DB.prepare('UPDATE workspaces SET payload=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? RETURNING revision').bind(payload,now,userId,row.revision));
   const saved=await env.DB.batch(statements);if(!saved.at(-1)?.results?.length)return 'retry';acknowledgements.push(...pending.map(n=>n.id));
  }
  if(acknowledgements.length)await call('ack',{userId,group,ids:acknowledgements});
  await env.DB.prepare('DELETE FROM relay_receipts WHERE user_id=? AND received_at<?').bind(userId,Date.now()-8*86400000).run();return rows.length===20||acknowledgements.length<rows.length?'pending':'current';
 }catch(error){return error instanceof NoticeInboxFullError?'full':'retry';}
}
