import {z} from 'zod';
import {dateInZone,type Workspace,type Task} from './model';
export const priorityOutput=z.object({summary:z.string().max(3000),proposals:z.array(z.object({taskId:z.string().min(1).max(100),priority:z.number().int().min(1).max(3),rank:z.number().int().min(1).max(80),reason:z.string().min(1).max(1000)})).max(80)});
export const priorityFormat={type:'json_schema',name:'nav_priority_review',strict:true,schema:{type:'object',additionalProperties:false,properties:{summary:{type:'string'},proposals:{type:'array',items:{type:'object',additionalProperties:false,properties:{taskId:{type:'string'},priority:{type:'integer'},rank:{type:'integer'},reason:{type:'string'}},required:['taskId','priority','rank','reason']}}},required:['summary','proposals']}};
export function priorityState(t:Task){return {id:t.id,title:t.title,date:t.date,due:t.due,dueAt:t.dueAt||'',priority:t.priority,minutes:t.minutes,status:t.status,archived:!!t.archived,topicId:t.topicId||''};}
export function priorityContext(w:Workspace,selected?:string[]){
 const pending=w.tasks.filter(t=>!t.archived&&t.status!=='done');
 if(selected&&(selected.length>80||new Set(selected).size!==selected.length||selected.some(id=>!pending.some(t=>t.id===id))))throw Error('Choose at most 80 distinct pending tasks.');
 const tasks=pending.filter(t=>!selected||selected.includes(t.id)).slice().sort((a,b)=>(a.dueAt||a.due||'9999').localeCompare(b.dueAt||b.due||'9999')||a.priority-b.priority).slice(0,80),relevant=new Set(tasks.flatMap(t=>t.topicId?[t.topicId]:[]));
 for(let i=0;i<w.topics.length;i++){const before=relevant.size;for(const d of w.studio?.dependencies||[])if(relevant.has(d.topicId))for(const id of d.requires)relevant.add(id);if(relevant.size===before)break;}
 return {today:dateInZone(w.profile.timezone),timezone:w.profile.timezone,dailyMinutes:w.profile.dailyMinutes,tasks:tasks.map(priorityState),dependencies:(w.studio?.dependencies||[]).filter(d=>relevant.has(d.topicId)),milestones:w.topics.filter(t=>relevant.has(t.id)).map(t=>({id:t.id,done:t.done})),busy:w.studio?.busy||[]};
}
export function reviewPriorities(w:Workspace,value:unknown){
 const output=priorityOutput.parse(value),seen=new Set<string>(),ranks=new Set<number>();
 return {...output,proposals:output.proposals.map(p=>{const task=w.tasks.find(t=>t.id===p.taskId&&!t.archived&&t.status!=='done');if(!task||seen.has(p.taskId)||ranks.has(p.rank))throw Error('AI returned an unknown, completed or duplicate task/rank. Nothing was applied.');seen.add(p.taskId);ranks.add(p.rank);return {...p,expected:priorityState(task)};}).sort((a,b)=>a.rank-b.rank)};
}
export type PriorityReview=ReturnType<typeof reviewPriorities>;
export function applyPriorities(w:Workspace,review:PriorityReview,selected:string[]){
 if(new Set(selected).size!==selected.length)throw Error('Duplicate priority selection.');
 const changes=selected.map(id=>{const p=review.proposals.find(p=>p.taskId===id),task=w.tasks.find(t=>t.id===id);if(!p||!task||JSON.stringify(priorityState(task))!==JSON.stringify(p.expected))throw Error('A selected task changed. Request a fresh priority review.');return {task,priority:p.priority};});
 for(const change of changes)change.task.priority=change.priority;
 return changes.length;
}
