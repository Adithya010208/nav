import {studio,type Studio} from './studio';
import {uid,dateInZone,type Workspace} from './model';
export function overlaps(a:{start:string;end:string},b:{start:string;end:string}){return Date.parse(a.start)<Date.parse(b.end)&&Date.parse(b.start)<Date.parse(a.end);}
export function slotPlan(w:Workspace,date:string,start:string,end:string){
 const from=Date.parse(start),until=Date.parse(end);if(!Number.isFinite(from)||!Number.isFinite(until)||until<=from||until-from>12*3600000)throw Error('Choose a study window of up to 12 hours.');
 if(dateInZone(w.profile.timezone,new Date(from))!==date||dateInZone(w.profile.timezone,new Date(until-1))!==date)throw Error('The study window must fall on the selected plan day in your workspace time zone.');
 const s=studio(w),obstacles=[...s.busy,...s.slots].filter(x=>Date.parse(x.end)>from&&Date.parse(x.start)<until).sort((a,b)=>a.start.localeCompare(b.start));
 const tasks=w.tasks.filter(t=>!t.archived&&t.status!=='done'&&t.date===date&&!s.slots.some(x=>x.taskId===t.id)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.priority-b.priority||a.id.localeCompare(b.id));
 const slots:Studio['slots']=[],unplaced:string[]=[];let used=w.tasks.filter(t=>t.date===date&&!t.archived&&(t.status==='done'||s.slots.some(x=>x.taskId===t.id))).reduce((n,t)=>n+t.minutes,0);
 for(const task of tasks){if(used+task.minutes>w.profile.dailyMinutes){unplaced.push(task.id);continue;}let cursor=from;for(const barrier of [...obstacles,...slots].sort((a,b)=>a.start.localeCompare(b.start))){if(cursor+task.minutes*60000<=Date.parse(barrier.start))break;if(cursor<Date.parse(barrier.end))cursor=Date.parse(barrier.end);}if(cursor+task.minutes*60000>until){unplaced.push(task.id);continue;}slots.push({id:uid(),taskId:task.id,start:new Date(cursor).toISOString(),end:new Date(cursor+task.minutes*60000).toISOString()});used+=task.minutes;}
 return {slots,unplaced};
}
export function conflicts(w:Workspace){const s=studio(w),items=[...s.busy.map(x=>({...x,kind:'Busy event',label:x.title})),...s.slots.map(x=>({...x,kind:'Study slot',label:w.tasks.find(t=>t.id===x.taskId)?.title||'Missing task'}))];return items.flatMap((a,i)=>items.slice(i+1).filter(b=>overlaps(a,b)).map(b=>({a,b})));}
