// Universal, vendor-neutral calendar synchronization for NAV
// Supports RFC 5545 WebCal publication feed (Google/Apple/Outlook subscription)
// and SSRF-protected external calendar sync (.ics URL import + conflict analysis).

import {Task,Profile,Workspace,uid,dateInZone,addDays} from './model';
import {importCalendar,mergeCalendar,type CalendarEvent} from './calendar-import';
import {conflicts,overlaps} from './slots';
export {replacementSlots,applyReplacement,conflicts,overlaps} from './slots';
import {editStudio,studio} from './studio';

const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');

function stamp(date:Date){
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
}

function foldLine(line:string):string{
  const bytes=new TextEncoder().encode(line);
  if(bytes.length<=73)return line;
  let output='',count=0;
  for(const char of line){
    const len=new TextEncoder().encode(char).length;
    if(count+len>73){
      output+='\r\n ';
      count=1;
    }
    output+=char;
    count+=len;
  }
  return output;
}

/**
 * Generates an RFC 5545 compliant iCalendar (WebCal) feed containing
 * the user's scheduled study slots, pending task deadlines, and exam milestones.
 */
export function generateCalendarFeed(w:Workspace,calendarName='NAV Study Schedule'):string{
  const s=studio(w);
  const today=dateInZone(w.profile.timezone);
  const now=new Date();
  const nowStamp=stamp(now);

  const lines=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NAV//Study Planner WebCal 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calendarName)}`,
    `X-WR-TIMEZONE:${escape(w.profile.timezone)}`,
  ];

  // 1. Export scheduled study slots
  for(const slot of s.slots){
    const task=w.tasks.find(t=>t.id===slot.taskId);
    if(task?.archived||task?.status==='done')continue;
    const start=new Date(slot.start),end=new Date(slot.end);
    if(isNaN(start.getTime())||isNaN(end.getTime()))continue;

    const title=task?`Study: ${task.title}`:'NAV Study Session';
    const desc=`Scheduled focus slot in NAV for ${task?.title||'study task'}.\nPriority: ${task?.priority||1} | Target duration: ${task?.minutes||30}m`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:slot-${slot.id}@nanba`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(desc)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Study slot starts in 10 minutes: ${escape(task?.title||'Study session')}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  // 2. Export pending task deadlines
  for(const t of w.tasks.filter(t=>!t.archived&&t.status!=='done')){
    if(t.dueAt&&t.due>=today){
      const dueDate=new Date(t.dueAt);
      if(!isNaN(dueDate.getTime())){
        const endDate=new Date(dueDate.getTime()+15*60000);
        const adv=t.advanceMinutes??60;
        lines.push(
          'BEGIN:VEVENT',
          `UID:deadline-${t.id}@nanba`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${stamp(dueDate)}`,
          `DTEND:${stamp(endDate)}`,
          `SUMMARY:${escape('Due: '+t.title)}`,
          `DESCRIPTION:${escape('Exact deadline: '+t.dueAt+' ('+(t.dueZone||w.profile.timezone)+')\n'+(t.notes||''))}`,
          'BEGIN:VALARM',
          `TRIGGER:-PT${adv}M`,
          'ACTION:DISPLAY',
          `DESCRIPTION:Approaching deadline: ${escape(t.title)}`,
          'END:VALARM',
          'END:VEVENT'
        );
      }
    }else if(t.due&&t.due>=today){
      lines.push(
        'BEGIN:VEVENT',
        `UID:deadline-${t.id}@nanba`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${t.due.replace(/-/g,'')}`,
        `DTEND;VALUE=DATE:${addDays(t.due,1).replace(/-/g,'')}`,
        `SUMMARY:${escape('Due: '+t.title)}`,
        `DESCRIPTION:${escape('Task due today: '+t.title+'\n'+(t.notes||''))}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT24H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Deadline tomorrow: ${escape(t.title)}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }
  }

  // 3. Export exam milestones
  for(const exam of s.exams||[]){
    const start=new Date(exam.startsAt),end=new Date(exam.endsAt);
    if(isNaN(start.getTime())||isNaN(end.getTime()))continue;

    lines.push(
      'BEGIN:VEVENT',
      `UID:exam-${exam.id}@nanba`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape('Exam: '+exam.subject)}`,
      `LOCATION:${escape(exam.location||'')}`,
      `DESCRIPTION:${escape(`Confirmed timetable exam (${exam.kind}). Time zone: ${exam.timezone}. Difficulty: ${exam.difficulty}/5`)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Exam tomorrow: ${escape(exam.subject)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n')+'\r\n';
}

/**
 * SSRF Guard: validates external URLs to prevent intranet, localhost,
 * link-local, and cloud metadata access.
 */
export function isPrivateOrLocalHost(hostname:string):boolean{
  const h=hostname.toLowerCase().trim();

  // Localhost & dot-local
  if(h==='localhost'||h==='127.0.0.1'||h==='::1'||h==='0.0.0.0'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.lan')||h.endsWith('.internal')||h.endsWith('.corp'))return true;

  // Numeric IPv4 checks
  const ipv4Match=h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(ipv4Match){
    const [_,a,b,c,d]=ipv4Match.map(Number);
    if(a<0||a>255||b<0||b>255||c<0||c>255||d<0||d>255)return true;
    // 127.0.0.0/8
    if(a===127)return true;
    // 10.0.0.0/8
    if(a===10)return true;
    // 172.16.0.0/12
    if(a===172&&b>=16&&b<=31)return true;
    // 192.168.0.0/16
    if(a===192&&b===168)return true;
    // 169.254.0.0/16 (Link local & AWS/Cloudflare/GCP metadata)
    if(a===169&&b===254)return true;
    // 100.64.0.0/10 (CGNAT)
    if(a===100&&b>=64&&b<=127)return true;
    // 0.0.0.0/8
    if(a===0)return true;
  }

  // Hex or decimal encoded IPv4 evasion attempts
  if(/^0x[0-9a-f]+$/i.test(h)||/^\d{8,12}$/.test(h))return true;

  // IPv6 bracketed link-local or loopback
  if(h.startsWith('[fe80:')||h.startsWith('fe80:')||h==='[::1]')return true;

  return false;
}

export function validateCalendarUrl(urlString:string):{ok:boolean;error?:string;url?:URL}{
  let parsed:URL;
  try{
    parsed=new URL(urlString);
  }catch{
    return {ok:false,error:'Invalid URL format.'};
  }

  if(parsed.protocol!=='https:'&&parsed.protocol!=='http:'){
    return {ok:false,error:'Calendar URL must use https:// or http:// protocol.'};
  }

  if(parsed.username||parsed.password){
    return {ok:false,error:'Credentials in calendar URL are not permitted.'};
  }

  if(isPrivateOrLocalHost(parsed.hostname)){
    return {ok:false,error:'Cannot fetch from local, private, or internal network addresses (SSRF protection).'};
  }

  return {ok:true,url:parsed};
}

/**
 * Fetches an external .ics calendar file over HTTPS with strict SSRF protection,
 * 2MB size cap, and 8-second timeout.
 */
export async function fetchRemoteCalendar(urlString:string,timeoutMs=8000):Promise<string>{
  const validation=validateCalendarUrl(urlString);
  if(!validation.ok||!validation.url){
    throw new Error(validation.error||'Invalid calendar URL.');
  }

  const response=await fetch(validation.url.toString(),{
    method:'GET',
    redirect:'error',
    signal:AbortSignal.timeout(timeoutMs),
    headers:{
      'User-Agent':'NAV-Calendar-Sync/2.0',
      'Accept':'text/calendar, text/plain, */*'
    }
  });

  if(!response.ok){
    throw new Error(`Remote calendar responded with HTTP ${response.status} ${response.statusText}`);
  }

  const contentType=response.headers.get('content-type')||'';
  // Allow text/calendar, text/plain, application/octet-stream, etc.

  const reader=response.body?.getReader();
  if(!reader){
    const text=await response.text();
    if(new TextEncoder().encode(text).length>2000000)throw new Error('Remote calendar exceeds 2 MB limit.');
    if(!text.includes('BEGIN:VCALENDAR'))throw new Error('The URL did not return a valid iCalendar VCALENDAR feed.');
    return text;
  }

  const chunks:Uint8Array[]=[];
  let totalBytes=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(value){
      totalBytes+=value.byteLength;
      if(totalBytes>2000000){
        reader.cancel();
        throw new Error('Remote calendar exceeds 2 MB limit.');
      }
      chunks.push(value);
    }
  }

  const concatenated=new Uint8Array(totalBytes);
  let offset=0;
  for(const chunk of chunks){
    concatenated.set(chunk,offset);
    offset+=chunk.byteLength;
  }

  const text=new TextDecoder('utf-8').decode(concatenated);
  if(!text.includes('BEGIN:VCALENDAR')){
    throw new Error('The URL did not return a valid iCalendar VCALENDAR feed.');
  }

  return text;
}

export type CalendarSyncResult={
  added:number;
  skippedDuplicates:number;
  totalEvents:number;
  warnings:string[];
  conflicts:ReturnType<typeof conflicts>;
  conflictingSlots:{
    slotId:string;
    taskId:string;
    taskTitle:string;
    start:string;
    end:string;
    clashesWith:string;
  }[];
};

/**
 * Synchronizes an external calendar into the workspace:
 * 1. Parses RFC 5545 events using importCalendar.
 * 2. Merges newly found events into workspace studio busy times.
 * 3. Immediately calculates any scheduling conflicts with existing study slots.
 */
export function syncCalendarFeed(w:Workspace,icsText:string):CalendarSyncResult{
  const s=editStudio(w); // Ensure studio object is present
  const {events,warnings}=importCalendar(icsText,w.profile.timezone);

  let added=0;
  let skippedDuplicates=0;

  for(const event of events){
    // If exact same event already exists in busy, skip duplicate
    if(s.busy.some(x=>x.calendarUid===event.calendarUid&&x.start===event.start&&x.end===event.end)){
      skippedDuplicates++;
      continue;
    }

    // If UID exists but time moved, replace it
    const existingIndex=s.busy.findIndex(x=>x.calendarUid===event.calendarUid);
    if(existingIndex>=0){
      s.busy[existingIndex]=event;
      added++;
    }else{
      s.busy.push(event);
      added++;
    }
  }

  // Calculate conflicts between all study slots and busy events
  const detectedConflicts=conflicts(w);

  // Map out specific study slots that clash with busy events
  const conflictingSlots:{slotId:string;taskId:string;taskTitle:string;start:string;end:string;clashesWith:string}[]=[];

  for(const c of detectedConflicts){
    if(c.a.kind==='Study slot'&&c.b.kind==='Busy event'){
      const task=w.tasks.find(t=>t.id===c.a.id);
      conflictingSlots.push({
        slotId:c.a.id,
        taskId:task?.id||'',
        taskTitle:task?.title||c.a.label,
        start:c.a.start,
        end:c.a.end,
        clashesWith:c.b.label
      });
    }else if(c.b.kind==='Study slot'&&c.a.kind==='Busy event'){
      const task=w.tasks.find(t=>t.id===c.b.id);
      conflictingSlots.push({
        slotId:c.b.id,
        taskId:task?.id||'',
        taskTitle:task?.title||c.b.label,
        start:c.b.start,
        end:c.b.end,
        clashesWith:c.a.label
      });
    }
  }

  return {
    added,
    skippedDuplicates,
    totalEvents:events.length,
    warnings,
    conflicts:detectedConflicts,
    conflictingSlots
  };
}
