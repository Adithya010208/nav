import {examSchema} from './exams';
import {z} from 'zod';
import {addDays,dateInZone,newTask,validDate,type Workspace,type Task} from './model';
const id=z.string().min(1).max(100),day=z.string().refine(validDate,'Invalid date'),optionalDay=z.union([day,z.literal('')]);
const title=z.string().trim().min(1).max(240),note=z.string().max(3000);
function safeURL(value:string){try{if(!value)return true;const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
export const studioSchema=z.object({
 exams:z.array(examSchema).max(100).default([]),
 memories:z.array(z.object({id,kind:z.enum(['goal','preference','project','fact']),text:z.string().trim().min(1).max(2000),date:day})).max(200).default([]),
 conversations:z.array(z.object({id,question:z.string().max(2000),answer:z.string().max(12000),mode:z.string().max(30),createdAt:z.string().datetime()})).max(50).default([]),
 projects:z.array(z.object({id,title,goal:note,due:optionalDay,status:z.enum(['active','paused','done']),taskIds:z.array(id).max(100),milestones:z.array(z.object({id,title,done:z.boolean()})).max(50)})).max(100).default([]),
 opportunities:z.array(z.object({id,title,organization:z.string().max(160),url:z.string().max(1000).refine(safeURL,'Use an HTTP(S) URL without credentials'),due:optionalDay,status:z.enum(['saved','applied','interview','offer','closed']),notes:note})).max(200).default([]),
 habits:z.array(z.object({id,title,days:z.array(day).max(1100)})).max(50).default([]),
 busy:z.array(z.object({id,title,calendarUid:z.string().max(300).optional(),start:z.string().datetime(),end:z.string().datetime()})).max(300).default([]),
 slots:z.array(z.object({id,taskId:id,start:z.string().datetime(),end:z.string().datetime()})).max(300).default([]),
 checkins:z.array(z.object({id,date:day,note,energy:z.enum(['low','steady','high'])})).max(730).default([]),
 wakePhrase:z.string().trim().max(60).default('Hey NAV'),
 dependencies:z.array(z.object({topicId:id,requires:z.array(id).max(30)})).max(500).default([]),
 activeRoadmap:z.array(id).max(500).default([]),
}).superRefine((s,ctx)=>{for(const key of ['exams','memories','conversations','projects','opportunities','habits','busy','slots','checkins'] as const)if(new Set(s[key].map(x=>x.id)).size!==s[key].length)ctx.addIssue({code:'custom',message:'Duplicate '+key+' IDs'});for(const v of [...s.busy,...s.slots])if(v.end<=v.start)ctx.addIssue({code:'custom',message:'Event end must follow its start'});for(const h of s.habits)if(new Set(h.days).size!==h.days.length)ctx.addIssue({code:'custom',message:'Duplicate habit day'});});
export type Studio=z.infer<typeof studioSchema>;
export function studio(w:Workspace):Studio{return w.studio||studioSchema.parse({});}
export function editStudio(w:Workspace){return w.studio??(w.studio=studioSchema.parse({}));}
export function reconcileSlots(w:Workspace){if(w.studio)w.studio.slots=w.studio.slots.filter(slot=>{const task=w.tasks.find(t=>t.id===slot.taskId&&!t.archived&&t.status!=='done');return !!task&&Date.parse(slot.end)-Date.parse(slot.start)===task.minutes*60000&&dateInZone(w.profile.timezone,new Date(slot.start))===task.date;});}
export function setDependencies(w:Workspace,topicId:string,requires:string[]){
 const s=editStudio(w),links=[...s.dependencies.filter(x=>x.topicId!==topicId),{topicId,requires:[...new Set(requires)]}];checkDependencies(w,links);s.dependencies=links;
}
function checkDependencies(w:Workspace,links:Studio['dependencies']){
 const ids=new Set(w.topics.map(t=>t.id)),edges=new Map(links.map(x=>[x.topicId,x.requires]));if(edges.size!==links.length)throw Error('Duplicate milestone dependency entries.');
 if(links.some(x=>!ids.has(x.topicId)||x.requires.some(id=>!ids.has(id)||id===x.topicId)))throw Error('Choose existing milestones and avoid a self dependency.');
 const visited=new Set<string>(),visiting=new Set<string>();function visit(id:string){if(visiting.has(id))throw Error('Dependencies cannot form a cycle.');if(visited.has(id))return;visiting.add(id);for(const parent of edges.get(id)||[])visit(parent);visiting.delete(id);visited.add(id);}for(const id of ids)visit(id);
}
export function validateStudioRelations(w:Workspace){
 if(!w.studio)return;const s=w.studio,taskIds=new Set(w.tasks.map(t=>t.id));
 if(s.projects.some(p=>p.taskIds.some(id=>!taskIds.has(id))))throw Error('A project references a missing task.');
 checkDependencies(w,s.dependencies);
 for(const e of s.exams||[]){if(e.sourceId&&!w.sources.some(x=>x.id===e.sourceId))throw Error('Exam source is missing.');if(e.topicIds.some(id=>!w.topics.some(t=>t.id===id)))throw Error('Exam milestone is missing.');}
 if(s.activeRoadmap.some(id=>!w.topics.some(t=>t.id===id)))throw Error('Active roadmap references a missing milestone.');
 for(const slot of s.slots){const task=w.tasks.find(t=>t.id===slot.taskId);if(!task||task.archived||task.status==='done'||Date.parse(slot.end)-Date.parse(slot.start)!==task.minutes*60000||dateInZone(w.profile.timezone,new Date(slot.start))!==task.date||dateInZone(w.profile.timezone,new Date(Date.parse(slot.end)-1))!==task.date)throw Error('A study slot no longer matches its active task, duration or date.');}
}
export function reportPeriod(w:Workspace,from:string,to:string,now=new Date()){
 if(!validDate(from)||!validDate(to)||to<from)throw Error('Choose a valid report date range.');
 const today=dateInZone(w.profile.timezone,now),end=to>today?today:to;
 const within=(day:string)=>day>=from&&day<=end;
 const completed=w.tasks.filter(t=>t.status==='done'&&t.completedAt&&within(t.completedAt));
 const sessions=w.sessions.filter(s=>Date.parse(s.endedAt)<=now.getTime()&&within(dateInZone(w.profile.timezone,new Date(s.endedAt))));
 const problems=w.problems.filter(p=>within(p.date));
 return {from,to:end,completed:completed.length,focusSeconds:sessions.reduce((n,s)=>n+s.seconds,0),problems:problems.length,independent:problems.filter(p=>p.result==='Independent').length,byDay:Array.from({length:Math.min(366,Math.max(0,Math.floor((Date.parse(end)-Date.parse(from))/86400000)+1))},(_,i)=>{const date=addDays(from,i);return {date,completed:completed.filter(t=>t.completedAt===date).length,focusSeconds:sessions.filter(s=>dateInZone(w.profile.timezone,new Date(s.endedAt))===date).reduce((n,s)=>n+s.seconds,0)};})};
}
export function productivity(w:Workspace,date:string,now=new Date()){
 const data=reportPeriod(w,date,date,now),items=w.tasks.filter(t=>!t.archived&&(t.date===date||t.status==='done'&&t.completedAt===date));
 const completedMinutes=date<=dateInZone(w.profile.timezone,now)?w.tasks.filter(t=>t.status==='done'&&t.completedAt===date).reduce((n,t)=>n+t.minutes,0):0;
 return {...data,score:Math.round(70*Math.min(1,completedMinutes/w.profile.dailyMinutes)+30*Math.min(1,data.focusSeconds/3600)),planned:items.length,explanation:'70 × completed task minutes / current daily capacity (capped at 1) + 30 × recorded focus hours (capped at 1). Moving unfinished tasks does not earn points. Task and focus measures can overlap; this measures saved records, not ability.'};
}
export function habitStreak(days:string[],today:string){const seen=new Set(days.filter(d=>d<=today));let cursor=seen.has(today)?today:addDays(today,-1),n=0;while(seen.has(cursor)&&n<1100){n++;cursor=addDays(cursor,-1);}return n;}
export function dailyDigest(w:Workspace,now=new Date()){
 const today=dateInZone(w.profile.timezone,now),active=w.tasks.filter(t=>!t.archived&&t.status!=='done'),planned=active.filter(t=>t.date===today),due=active.filter(t=>t.due&&t.due<=addDays(today,1)),notices=w.sources.filter(s=>Date.parse(s.receivedAt)<=now.getTime()&&dateInZone(w.profile.timezone,new Date(s.receivedAt))===today);
 const older=w.sources.some(s=>Date.parse(s.receivedAt)<=now.getTime()&&dateInZone(w.profile.timezone,new Date(s.receivedAt))<today);
 return today+' · '+planned.length+' unfinished tasks planned today · '+due.length+' deadlines due soon or overdue.\n'+(notices.length?notices.slice().sort((a,b)=>a.receivedAt.localeCompare(b.receivedAt)).slice(-5).map(s=>s.title+' [source '+s.id+']').join('\n'):'No notices received today are saved.')+(older?'\nOlder saved notices remain in College inbox.':'');
}
export function memoryContext(w:Workspace,question:string){
 const data=studio(w),terms=question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[];
 const rank=(s:string)=>terms.reduce((n,t)=>n+(s.toLowerCase().includes(t)?1:0),0);
 return {memories:data.memories.slice().sort((a,b)=>rank(b.text)-rank(a.text)||b.date.localeCompare(a.date)).slice(0,8).map(({id,kind,text})=>({id,kind,text})),conversation:data.conversations.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-4).map(({question,answer})=>({question,answer:answer.slice(0,1600)}))};
}
export function searchWorkspace(w:Workspace,query:string){const q=query.trim().toLowerCase();if(!q)return [];const s=studio(w);return [
 ...w.tasks.map(x=>({id:x.id,kind:'Task',title:x.title,text:x.notes})),...w.sources.map(x=>({id:x.id,kind:'Source',title:x.title,text:x.text})),
 ...s.memories.map(x=>({id:x.id,kind:'Memory',title:x.kind,text:x.text})),...s.conversations.map(x=>({id:x.id,kind:'Conversation',title:x.question,text:x.answer})),
 ...s.projects.map(x=>({id:x.id,kind:'Project',title:x.title,text:x.goal})),...s.opportunities.map(x=>({id:x.id,kind:'Opportunity',title:x.title,text:x.organization+' '+x.notes})),
 ].filter(x=>(x.title+' '+x.text).toLowerCase().includes(q)).slice(0,50);}
export function revisionTasks(w:Workspace,problemId:string,today:string){const problem=w.problems.find(p=>p.id===problemId);if(!problem)throw Error('Practice record no longer exists.');return [problem.review3,problem.review14].filter((date,index)=>!w.tasks.some(t=>!t.archived&&(t.notes==='problem:'+problemId+':'+index||index===0&&t.notes==='problem:'+problemId))).map(date=>newTask({title:'Re-solve '+problem.title,category:'Revision',date:date<today?today:date,minutes:25,notes:'problem:'+problemId+':'+(date===problem.review3?0:1)}));}
export function recurringTasks(w:Workspace,values:{title:string;date:string;minutes:number;every:number;count:number}){
 if(!validDate(values.date)||!values.title.trim()||values.title.length>240||!Number.isInteger(values.count)||values.count<1||values.count>12||!Number.isInteger(values.every)||values.every<1||values.every>90||!Number.isInteger(values.minutes)||values.minutes<5||values.minutes>480)throw Error('Use a title, valid date, 5–480 minutes, 1–90 day interval and at most 12 occurrences.');
 const series='repeat:'+values.title.trim().toLowerCase()+':'+values.date+':'+values.every;
 return Array.from({length:values.count},(_,i)=>newTask({title:values.title.trim(),date:addDays(values.date,i*values.every),minutes:values.minutes,category:'Personal',notes:series})).filter(t=>!w.tasks.some(x=>!x.archived&&x.date===t.date&&x.notes===series));
}
export type VoiceAction={kind:'create';task:Task}|{kind:'complete';matches:Task[]}|{kind:'briefing';text:string};
export function voiceAction(w:Workspace,spoken:string,now=new Date()):VoiceAction{
 const today=dateInZone(w.profile.timezone,now),phrase=studio(w).wakePhrase;let text=spoken.trim();if(phrase&&text.toLowerCase().startsWith(phrase.toLowerCase()))text=text.slice(phrase.length).replace(/^[\s,:.!]+/,'');
 const complete=text.match(/^(?:complete|mark done|finish)\s+(.+)$/i);if(complete){const q=complete[1].replace(/[.!]$/,'').trim().toLowerCase();const matches=w.tasks.filter(t=>!t.archived&&t.status!=='done'&&t.title.toLowerCase()===q);if(!matches.length)throw Error('No unfinished task exactly matches that title. Say “complete” followed by the exact task title.');return {kind:'complete',matches};}
 const create=text.match(/^(?:create|add)(?: a)? task\s+(.+)$/i);if(create){let title=create[1],date=today,minutes=30;const duration=title.match(/\s+for\s+(\d+)\s+minutes?\.?$/i);if(duration){minutes=Number(duration[1]);title=title.slice(0,duration.index);}const datePart=title.match(/\s+(today|tomorrow|on \d{4}-\d{2}-\d{2})\.?$/i);if(datePart){date=datePart[1].toLowerCase()==='tomorrow'?addDays(today,1):datePart[1].toLowerCase()==='today'?today:datePart[1].slice(3);title=title.slice(0,datePart.index);}if(!title.trim()||title.length>240||!validDate(date)||minutes<5||minutes>480)throw Error('Check the task title, date and 5–480 minute duration.');return {kind:'create',task:newTask({title:title.trim(),date,minutes,category:'Personal'})};}
 if(/schedule|briefing|plan|progress/i.test(text)){const tasks=w.tasks.filter(t=>!t.archived&&t.date===today);return {kind:'briefing',text:tasks.length?tasks.map(t=>t.title+' · '+t.status+' · '+t.minutes+' minutes').join('\n'):'No tasks are planned today.'};}
 throw Error('Try “add task Revise maths tomorrow for 30 minutes”, “complete Exact task title”, or “read my schedule”. A saved prefix is recognized only in submitted recordings, not background listening.');
}
