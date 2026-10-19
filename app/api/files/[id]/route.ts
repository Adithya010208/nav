import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in first.'},401);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(request.headers.get('X-NAV-Confirm')!=='delete-document')return json({error:'Confirm document deletion first.'},400);
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Not found.'},404);
 if(!env.DB||!env.BUCKET)return json({error:'Storage unavailable.'},503);
 try{
  const file=await env.DB.prepare('SELECT id FROM files WHERE id=? AND user_id=?').bind(id,user.userId).first();
  if(!file)return json({error:'Not found.'},404);
  await env.BUCKET.delete(user.userId+'/'+id);
  await env.DB.prepare('DELETE FROM files WHERE id=? AND user_id=?').bind(id,user.userId).run();
  return json({deleted:true});
 }catch{return json({error:'Deletion could not finish. Refresh the file list and retry.'},503);}
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const u=await getChatGPTUser();if(!u)return new Response('Sign in first.',{status:401});const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found.',{status:404});if(!env.DB||!env.BUCKET)return new Response('Storage unavailable.',{status:503});const file=await env.DB.prepare('SELECT name,mime FROM files WHERE id=? AND user_id=?').bind(id,u.userId).first<{name:string;mime:string}>();if(!file)return new Response('Not found.',{status:404});const object=await env.BUCKET.get(u.userId+'/'+id);if(!object)return new Response('Not found.',{status:404});return new Response(object.body,{headers:{'Content-Type':file.mime,'Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}
