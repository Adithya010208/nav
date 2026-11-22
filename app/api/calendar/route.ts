import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {workspaceSchema} from '@/lib/validation';
import {emptyWorkspace} from '@/lib/model';
import {limitedBytes} from '@/lib/http';
import {generateCalendarFeed,fetchRemoteCalendar,syncCalendarFeed,validateCalendarUrl} from '@/lib/calendar-sync';

export const dynamic='force-dynamic';

const json=(data:unknown,status=200)=>Response.json(data,{
  status,
  headers:{
    'Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff'
  }
});

/**
 * GET /api/calendar
 * Serves the live RFC 5545 WebCal feed for Google Calendar, Apple Calendar, and Outlook.
 * Authenticated via ChatGPT session or private subscription token (?token=...).
 */
export async function GET(request:Request){
  const url=new URL(request.url);
  const token=url.searchParams.get('token')||request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');

  let userId:string|null=null;
  const user=await getChatGPTUser();

  if(user){
    userId=user.userId;
  }else if(token){
    // Private subscription token: must be non-empty and safe string
    if(token.length>=8&&token.length<=128&&/^[a-zA-Z0-9_\-\.]+$/.test(token)){
      userId=token.startsWith('usr_')?token:token;
    }
  }

  if(!userId){
    return json({error:'Authentication required. Sign in or provide a valid subscription token.'},401);
  }

  try{
    let workspace=emptyWorkspace();

    if(env.DB){
      const row=await env.DB.prepare('SELECT payload FROM workspaces WHERE user_id = ?').bind(userId).first<{payload:string}>();
      if(row?.payload){
        const parsed=workspaceSchema.safeParse(JSON.parse(row.payload));
        if(parsed.success){
          workspace=parsed.data;
        }
      }
    }

    const feed=generateCalendarFeed(workspace,'NAV Study Schedule');

    return new Response(feed,{
      status:200,
      headers:{
        'Content-Type':'text/calendar; charset=utf-8',
        'Content-Disposition':'inline; filename="nav-study-calendar.ics"',
        'Cache-Control':'private, no-cache, no-store',
        'X-Content-Type-Options':'nosniff'
      }
    });
  }catch{
    return json({error:'Calendar feed generation failed.'},500);
  }
}

/**
 * POST /api/calendar
 * Synchronizes an external calendar URL or ICS payload into workspace busy times.
 * Includes SSRF validation, size bounds, and immediate conflict detection with study slots.
 */
export async function POST(request:Request){
  const url=new URL(request.url);
  const user=await getChatGPTUser();
  const authHeader=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');

  const userId=user?.userId||(authHeader&&authHeader.length>=8?authHeader:null);
  if(!userId){
    return json({error:'Sign in or provide authentication before synchronizing.'},401);
  }

  if(user&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin){
    return json({error:'Invalid origin.'},403);
  }

  let body:{url?:string;icsText?:string};
  try{
    const text=new TextDecoder().decode(await limitedBytes(request,2100000));
    body=JSON.parse(text);
  }catch{
    return json({error:'Invalid bounded JSON.'},400);
  }

  if(!body||typeof body!=='object'){
    return json({error:'Request body must be an object with url or icsText.'},400);
  }

  let icsText=body.icsText;

  if(body.url){
    const valid=validateCalendarUrl(body.url);
    if(!valid.ok){
      return json({error:valid.error||'Invalid calendar URL.'},400);
    }
    try{
      icsText=await fetchRemoteCalendar(body.url,8000);
    }catch(err){
      return json({error:err instanceof Error?err.message:'Failed to fetch remote calendar.'},502);
    }
  }

  if(!icsText||typeof icsText!=='string'){
    return json({error:'Provide a calendar URL (url) or raw iCalendar text (icsText).'},400);
  }

  try{
    let workspace=emptyWorkspace();
    let revision=0;

    if(env.DB){
      const row=await env.DB.prepare('SELECT payload, revision FROM workspaces WHERE user_id = ?').bind(userId).first<{payload:string;revision:number}>();
      if(row?.payload){
        const parsed=workspaceSchema.safeParse(JSON.parse(row.payload));
        if(parsed.success){
          workspace=parsed.data;
          revision=row.revision;
        }
      }
    }

    const syncReport=syncCalendarFeed(workspace,icsText);

    // Save updated workspace if DB is present and changes occurred
    if(env.DB&&syncReport.added>0){
      const now=new Date().toISOString();
      await env.DB.prepare('UPDATE workspaces SET payload = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?')
        .bind(JSON.stringify(workspace),now,userId,revision)
        .run();
    }

    return json({
      ok:true,
      added:syncReport.added,
      skippedDuplicates:syncReport.skippedDuplicates,
      totalEvents:syncReport.totalEvents,
      conflicts:syncReport.conflicts,
      conflictingSlots:syncReport.conflictingSlots,
      warnings:syncReport.warnings
    });
  }catch(err){
    return json({error:err instanceof Error?err.message:'Calendar synchronization failed.'},400);
  }
}
