import {z} from 'zod';
import {dateInZone,addDays,newTask,uid,type Workspace,type Task,type Source} from './model';
import {clockInZone,deadlineHint,exactDeadline,validZone} from './deadlines';
export const examSchema=z.object({id:z.string().min(1).max(100),subject:z.string().trim().min(1).max(240),startsAt:z.string().datetime(),endsAt:z.string().datetime(),timezone:z.string().max(80).refine(validZone),kind:z.string().max(80),location:z.string().max(240),sourceId:z.string().min(1).max(100).optional(),difficulty:z.number().int().min(1).max(5),confidence:z.number().int().min(1).max(5),topicIds:z.array(z.string().max(100)).max(50)}).superRefine((exam,ctx)=>{if(exam.endsAt<=exam.startsAt||Date.parse(exam.endsAt)-Date.parse(exam.startsAt)>12*3600000)ctx.addIssue({code:'custom',message:'Exam end must follow start by at most 12 hours'});});
export type Exam=z.infer<typeof examSchema>;
export function examCandidates(source:Source,zone:string){
 return source.text.split(/\n+/).map(t=>t.trim()).filter(t=>/exam|test|assessment|\d{1,2}[/.]\d{1,2}[/.]20\d{2}|20\d{2}-\d{2}-\d{2}/i.test(t)).slice(0,30).map(line=>({line,hint:deadlineHint(line,dateInZone(zone,new Date(source.receivedAt)),zone)})).filter(x=>x.hint.due);
}
export function examFromForm(f:FormData,fallbackZone:string):Exam{
 const zone=String(f.get('timezone')||fallbackZone),date=String(f.get('date')),start=String(f.get('start')),end=String(f.get('end'));
 return examSchema.parse({id:String(f.get('id')||uid()),subject:String(f.get('subject')),startsAt:exactDeadline(date,start,zone,String(f.get('fold')||'reject')),endsAt:exactDeadline(date,end,zone,String(f.get('fold')||'reject')),timezone:zone,kind:String(f.get('kind')||'Exam'),location:String(f.get('location')||''),...(f.get('sourceId')?{sourceId:String(f.get('sourceId'))}:{}),difficulty:Number(f.get('difficulty')||3),confidence:Number(f.get('confidence')||3),topicIds:f.getAll('topics').map(String)});
}
export function saveExam(w:Workspace,exam:Exam){
 if(!w.studio)throw Error('Initialize your study workspace first.');
 const exams=w.studio.exams??(w.studio.exams=[]),value=examSchema.parse(exam);
 if(exams.some(e=>e.id!==value.id&&e.subject.trim().toLowerCase()===value.subject.trim().toLowerCase()&&e.startsAt===value.startsAt))throw Error('This subject and examination time already exist. Edit the saved exam.');
 const index=exams.findIndex(e=>e.id===value.id);if(index<0)exams.push(value);else exams[index]=value;
}
export function examPlanStamp(w:Workspace){return JSON.stringify({profile:w.profile,tasks:w.tasks.map(t=>[t.id,t.date,t.due,t.dueAt,t.minutes,t.status,t.archived,t.notes]),busy:w.studio?.busy,slots:w.studio?.slots,exams:w.studio?.exams,dependencies:w.studio?.dependencies,topics:w.topics.map(t=>[t.id,t.done])});}
export function prepareExams(w:Workspace,now=new Date()){
 const today=dateInZone(w.profile.timezone,now),exams=(w.studio?.exams||[]).filter(e=>Date.parse(e.startsAt)>now.getTime()).slice().sort((a,b)=>a.startsAt.localeCompare(b.startsAt)),tasks:Task[]=[],slots:{id:string;taskId:string;start:string;end:string}[]=[],warnings:string[]=[];
 examLoop:for(const exam of exams){
  const topics=exam.topicIds.map(id=>w.topics.find(t=>t.id===id)).filter((t):t is Workspace['topics'][number]=>!!t);
  if(topics.some(topic=>(w.studio?.dependencies.find(d=>d.topicId===topic.id)?.requires||[]).some(id=>!w.topics.find(t=>t.id===id)?.done))){warnings.push(exam.subject+': complete its saved prerequisites before scheduling preparation.');continue;}
  const steps=[...topics.filter(t=>!t.done).slice(0,8).map(t=>'Study '+t.title),'Practice test','Review mistakes','Final revision'];
  for(const [index,step] of steps.entries()){
   if(tasks.length>=120){warnings.push('Preview limited to 120 preparation tasks. Apply or narrow the exams first.');break examLoop;}
   const marker='exam:'+exam.id+':'+index;if(w.tasks.some(t=>!t.archived&&t.notes===marker))continue;
   const minutes=Math.min(60,20+5*(exam.difficulty+6-exam.confidence)),candidate=newTask({title:exam.subject+' · '+step,category:'Revision',minutes,due:dateInZone(w.profile.timezone,new Date(exam.startsAt)),dueAt:exam.startsAt,dueZone:w.profile.timezone,advanceMinutes:60,priority:1,notes:marker,...(exam.sourceId?{sourceId:exam.sourceId}:{})});let placed=false;
   for(let offset=0;offset<30;offset++){
    const date=addDays(today,offset),used=[...w.tasks,...tasks].filter(t=>!t.archived&&t.date===date).reduce((n,t)=>n+t.minutes,0);if(used+minutes>w.profile.dailyMinutes)continue;
    let from:number,until:number;try{from=Date.parse(exactDeadline(date,w.profile.studyTime,w.profile.timezone,'earlier'));until=Date.parse(exactDeadline(addDays(date,1),'00:00',w.profile.timezone,'earlier'));}catch{continue;}
    if(from>=Date.parse(exam.startsAt))break;let cursor=Math.max(from,Math.ceil(now.getTime()/60000)*60000+5*60000),end=Math.min(until,from+12*3600000,Date.parse(exam.startsAt));
    const obstacles=[...(w.studio?.busy||[]),...(w.studio?.slots||[]),...slots,...exams.map(e=>({start:e.startsAt,end:e.endsAt}))].filter(e=>Date.parse(e.end)>cursor&&Date.parse(e.start)<end).sort((a,b)=>a.start.localeCompare(b.start));
    for(const barrier of obstacles){if(cursor+minutes*60000<=Date.parse(barrier.start))break;if(cursor<Date.parse(barrier.end))cursor=Date.parse(barrier.end);}
    if(cursor+minutes*60000>end)continue;candidate.date=date;tasks.push(candidate);slots.push({id:uid(),taskId:candidate.id,start:new Date(cursor).toISOString(),end:new Date(cursor+minutes*60000).toISOString()});placed=true;break;
   }
   if(!placed)warnings.push(exam.subject+' · '+step+': no free capacity before the exam.');
  }
 }
 return {stamp:examPlanStamp(w),tasks,slots,warnings};
}
export function examLocal(exam:Exam){return {date:dateInZone(exam.timezone,new Date(exam.startsAt)),start:clockInZone(exam.startsAt,exam.timezone),end:clockInZone(exam.endsAt,exam.timezone)};}
