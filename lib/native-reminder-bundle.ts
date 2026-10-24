import {addDays,dateInZone,type Workspace} from './model';
import {wallInstants} from './deadlines';
import {defaultReminderPolicy} from './reminder-policy';
import type {NativeReminderBundle,NativeReminderEvent} from '../supabase/functions/_shared/reminder-protocol';
// Contains only task titles/dates/status, profile clock preferences and derived notification windows.
// Sources, documents, exam records, study slots and personal reflections never enter this payload.
export function nativeReminderBundle(w:Workspace,now=new Date()):NativeReminderBundle{
 const start=now.getTime(),expiresAt=start+72*3600000,p=w.studio?.reminderPolicy||defaultReminderPolicy(),zone=w.profile.timezone,today=dateInZone(zone,now),tasks=w.tasks.filter(t=>!t.archived&&t.status!=='done'),events:NativeReminderEvent[]=[],exact=tasks.filter(t=>t.dueAt).map(task=>({task,at:Date.parse(task.dueAt!),day:dateInZone(zone,new Date(task.dueAt!))})),quiet:{start:number;end:number}[]=[];
 const clock=(day:string,time:string)=>{const values=wallInstants(day,time,zone);return values.length?Date.parse(values[0]):NaN;};
 if(p.enabled&&p.quietEnabled)for(let offset=-1;offset<5;offset++){
  const day=addDays(today,offset),next=p.quietStart>p.quietEnd?addDays(day,1):day,starts=wallInstants(day,p.quietStart,zone),ends=wallInstants(next,p.quietEnd,zone);
  quiet.push({start:starts.length?Date.parse(starts[0]):clock(day,'00:00'),end:ends.length?Date.parse(ends[ends.length-1]):clock(addDays(next,1),'00:00')});
 }
 function append(id:string,title:string,body:string,at:number,until:number){
  at=Math.max(at,start);until=Math.min(until,expiresAt);if(!Number.isFinite(at)||!Number.isFinite(until)||until<=Math.max(at,start))return;
  let segments=[{at,until}];for(const q of quiet)segments=segments.flatMap(s=>q.end<=s.at||q.start>=s.until?[s]:[{at:s.at,until:Math.min(q.start,s.until)},{at:Math.max(s.at,q.end),until:s.until}].filter(s=>s.until>Math.max(start,s.at)));
  const eligible=segments.find(s=>s.until>Math.max(start,s.at));if(eligible)events.push({id,title,body,...eligible});
 }
 if(w.profile.onboarded)for(let offset=0;offset<4;offset++){
  const day=addDays(today,offset),end=clock(addDays(day,1),'00:00'),planned=tasks.filter(t=>t.date===day),dayStart=clock(day,'00:00');
  const due=tasks.filter(t=>!t.dueAt&&t.due&&t.due<=addDays(day,1)).sort((a,b)=>a.due.localeCompare(b.due));
  if(due.length)append(day+':deadlines','NAV · Deadlines need attention',due.length===1?due[0].title+' · '+(due[0].due<day?'overdue':'due '+due[0].due):due.length+' unfinished tasks are due soon or overdue.',clock(day,'08:00'),end);
  const study=clock(day,w.profile.studyTime);append(day+':study',planned.length?'NAV · Your study plan is ready':'NAV · Plan your study session',planned.length?planned.length+' tasks today. Start with '+planned[0].title+'.':'No tasks planned today. Open NAV to choose your next step.',Math.max(dayStart,study-(planned.length?10:0)*60000),Math.min(end,study+3600000));
  for(const {task:t,at,day:exactDay} of exact){
   const key=day+':exact:'+t.id+':'+t.dueAt;
   if(exactDay===day)append(key+':at','NAV · Deadline now',t.title.slice(0,160),at,at+10*60000);
   if(at+10*60000<end)append(key+':overdue','NAV · Exact deadline overdue',t.title.slice(0,160)+' · open NAV to review or reschedule.',Math.max(clock(day,'08:00'),at+10*60000),end);
  }
  if(p.enabled){
   const push=(kind:string,time:string,title:string,body:string)=>{const at=clock(day,time);append(day+':'+kind+':'+time,title,body,at,at+p.graceMinutes*60000);};
   if(p.morningEnabled)push('morning',p.morning,'NAV · Morning study briefing',planned.length+' unfinished tasks today · '+tasks.filter(t=>t.dueAt?Date.parse(t.dueAt)<end+86400000:!!t.due&&t.due<=addDays(day,1)).length+' deadlines due soon or overdue. Open NAV for your full briefing.');
   if(p.eveningEnabled&&!w.studio?.checkins.some(c=>c.date===day))push('evening',p.evening,'NAV · Evening check-in',planned.length+' unfinished tasks today. Open My tools → Review to reflect and review rescheduling.');
   const missed=tasks.filter(t=>t.date<day||t.status==='missed');if(p.missedEnabled&&missed.length)push('missed',p.missed,'NAV · Review unfinished work',missed.length+' unfinished tasks need review. Open NAV to keep, reschedule or archive; nothing moved automatically.');
  }
 }
 if(w.profile.onboarded)for(const {task:t,at,day} of exact){const lead=(t.advanceMinutes??60)*60000;if(lead)append(day+':exact:'+t.id+':'+t.dueAt+':advance','NAV · Deadline approaching',t.title.slice(0,160),at-lead,at);}
 events.sort((a,b)=>Math.max(start,a.at)-Math.max(start,b.at)||a.id.localeCompare(b.id));return {version:2,generatedAt:start,expiresAt,events:events.slice(0,500),truncated:events.length>500};
}
