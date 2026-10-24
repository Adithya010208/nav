import type {Workspace} from './model';
import {dateInZone,addDays} from './model';
import {wallInstants} from './deadlines';
import {defaultReminderPolicy,quietAt} from './reminder-policy';
export type ReminderEvent={id:string;title:string;body:string};
export function reminderClock(w:Workspace,now:Date){return new Intl.DateTimeFormat('en-GB',{timeZone:w.profile.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);}
// No provider calls, writes or source text. Native snapshot v1 deliberately remains unchanged.
export function proactiveEvents(w:Workspace,now=new Date()):ReminderEvent[]{
 const p=w.studio?.reminderPolicy||defaultReminderPolicy();if(!w.profile.onboarded||!p.enabled||quietAt(reminderClock(w,now),p))return [];
 const day=dateInZone(w.profile.timezone,now),active=w.tasks.filter(t=>!t.archived&&t.status!=='done'),today=active.filter(t=>t.date===day),events:ReminderEvent[]=[];
 function due(clock:string){const instants=wallInstants(day,clock,w.profile.timezone);if(!instants.length)return false;const at=Date.parse(instants[0]);return now.getTime()>=at&&now.getTime()<at+p.graceMinutes*60000;}
 if(p.morningEnabled&&due(p.morning)){
  const soon=active.filter(t=>t.dueAt?Date.parse(t.dueAt)<=now.getTime()+86400000:!!t.due&&t.due<=addDays(day,1));
  const first=today.slice().sort((a,b)=>a.priority-b.priority||(a.dueAt||a.due||'9999').localeCompare(b.dueAt||b.due||'9999'))[0];
  const scheduled=w.studio?.slots.filter(s=>dateInZone(w.profile.timezone,new Date(s.start))===day&&today.some(t=>t.id===s.taskId)).length||0,exams=w.studio?.exams.filter(e=>Date.parse(e.startsAt)>=now.getTime()&&Date.parse(e.startsAt)<now.getTime()+86400000).length||0;
  events.push({id:day+':morning:'+p.morning,title:'NAV · Morning study briefing',body:today.length+' unfinished tasks today · '+soon.length+' deadlines due soon or overdue · '+scheduled+' scheduled study sessions · '+exams+' exams in the next 24 hours.'+(first?' Start with '+first.title.slice(0,100)+'.':' Open NAV to choose your next task.')});
 }
 if(p.eveningEnabled&&due(p.evening)&&!w.studio?.checkins.some(c=>c.date===day)){
  const completed=w.tasks.filter(t=>!t.archived&&t.status==='done'&&t.completedAt===day).length;
  events.push({id:day+':evening:'+p.evening,title:'NAV · Evening check-in',body:completed+' tasks completed today · '+today.length+' still planned. Open My tools → Review to reflect and review rescheduling.'});
 }
 if(p.missedEnabled&&due(p.missed)){
  const missed=active.filter(t=>t.date<day||t.status==='missed'||w.studio?.slots.some(s=>s.taskId===t.id&&Date.parse(s.end)+p.missedGraceMinutes*60000<=now.getTime()));
  if(missed.length)events.push({id:day+':missed:'+p.missed,title:'NAV · Review unfinished work',body:missed.length+' unfinished '+(missed.length===1?'task needs':'tasks need')+' review. Open NAV to keep, reschedule or archive; nothing has been moved automatically.'});
 }
 return events;
}
