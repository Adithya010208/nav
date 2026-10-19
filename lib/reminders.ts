import {Workspace,dateInZone,addDays} from './model';
export function reminderEvents(workspace:Workspace,now=new Date()) {
 if(!workspace.profile.onboarded)return [];
 const date=dateInZone(workspace.profile.timezone,now),time=new Intl.DateTimeFormat('en-GB',{timeZone:workspace.profile.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const active=workspace.tasks.filter(t=>!t.archived&&t.status!=='done'),events:{id:string;title:string;body:string}[]=[];
 const due=active.filter(t=>t.due&&t.due<=addDays(date,1)).sort((a,b)=>a.due.localeCompare(b.due));
 if(due.length&&time>='08:00')events.push({id:date+':deadlines',title:'NAV · Deadlines need attention',body:due.length===1?due[0].title.slice(0,120)+' · '+(due[0].due<date?'overdue':'due '+due[0].due):`${due.length} unfinished tasks are due soon or overdue. Open NAV to review.`});
 const planned=active.filter(t=>t.date===date),[hour,minute]=time.split(':').map(Number),[studyHour,studyMinute]=workspace.profile.studyTime.split(':').map(Number),difference=hour*60+minute-(studyHour*60+studyMinute);
 if(planned.length&&difference>=-10&&difference<=60)events.push({id:date+':study',title:'NAV · Your study plan is ready',body:`${planned.length} tasks today. Start with ${planned[0].title.slice(0,120)}.`});
 return events;
}
