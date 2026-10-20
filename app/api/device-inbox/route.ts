import {env} from 'cloudflare:workers';
import {limitedBytes} from '@/lib/http';
import {deviceJSON as json,deviceBearer,tokenHash} from '@/lib/devices';
import {mergeNoticeBundle,readNoticeBundle} from '@/lib/notice-transfer';
import {workspaceSchema} from '@/lib/validation';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const token=deviceBearer(request);if(!token)return json({error:'A valid device credential is required.'},401);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Send a JSON notice bundle.'},415);
 if(!env.DB)return json({error:'Database unavailable.'},503);
 try{
  const now=new Date().toISOString(),hash=await tokenHash(token);
  const device=await env.DB.prepare('SELECT id,user_id,group_name FROM devices WHERE token_hash=? AND revoked=0 AND expires_at>?').bind(hash,now).first<{id:string;user_id:string;group_name:string}>();if(!device)return json({error:'Device expired or revoked. Reconnect it from NAV.'},401);
  let bundle;try{bundle=readNoticeBundle(new TextDecoder().decode(await limitedBytes(request,500000)),device.group_name);}catch(error){return json({error:error instanceof Error?error.message:'Invalid notice bundle.'},400);}
  const row=await env.DB.prepare('SELECT payload,revision FROM workspaces WHERE user_id=?').bind(device.user_id).first<{payload:string;revision:number}>();if(!row)return json({error:'Workspace unavailable.'},409);
  const parsed=workspaceSchema.safeParse(JSON.parse(row.payload));if(!parsed.success)return json({error:'Workspace needs repair before device sync.'},409);
  if(parsed.data.profile.approvedGroup!==device.group_name)return json({error:'Approved group changed. Revoke and reconnect this device.'},409);
  const day=now.slice(0,10);const allowed=await env.DB.prepare('UPDATE devices SET usage_count=CASE WHEN usage_day=? THEN usage_count+1 ELSE 1 END,usage_day=?,last_seen_at=? WHERE id=? AND revoked=0 AND expires_at>? AND (usage_day<>? OR usage_count<240) RETURNING id').bind(day,day,now,device.id,now,day).first();if(!allowed)return json({error:'Device unavailable or daily sync limit reached.'},429);
  let merged;try{merged=mergeNoticeBundle(parsed.data,bundle);}catch{return json({error:'Inbox is full or the approved group changed. Review NAV before retrying.'},409);}
  if(!workspaceSchema.safeParse(merged.workspace).success)return json({error:'Notice import failed validation.'},400);
  if(!merged.added)return json({added:0,duplicates:merged.duplicates});
  const payload=JSON.stringify(merged.workspace);if(new TextEncoder().encode(payload).length>1800000)return json({error:'Workspace storage limit reached. Retain local notices and review your inbox.'},409);
  const saved=await env.DB.prepare('UPDATE workspaces SET payload=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? AND EXISTS (SELECT 1 FROM devices WHERE id=? AND revoked=0 AND expires_at>?) RETURNING revision').bind(payload,now,device.user_id,row.revision,device.id,now).first();
  if(!saved)return json({error:'Workspace changed or device was revoked. Retry without dropping the local notices.'},409);
  return json({added:merged.added,duplicates:merged.duplicates});
 }catch{return json({error:'Sync unavailable. Retain local notices and retry later.'},503);}
}
