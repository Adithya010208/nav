import {dateInZone,validDate,addDays,uid,type Source,type Suggestion,type Task,type Workspace} from './model';
import {deadlineHint} from './deadlines';
export function findExtractedTask(tasks:Task[],sourceId:string,title:string){
 const clean=(t:string)=>t.toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
 const target=clean(title);if(!target)return undefined;
 return tasks.find(t=>!t.archived&&t.sourceId===sourceId&&clean(t.title)===target);
}
export function removeImportedNotice(workspace:Workspace,sourceId:string){
 if(!workspace.sources.some(s=>s.id===sourceId))throw Error('This notice no longer exists. Reload your inbox.');
 workspace.sources=workspace.sources.filter(s=>s.id!==sourceId);
 workspace.suggestions=workspace.suggestions.filter(s=>s.sourceId!==sourceId);
 for(const task of workspace.tasks)if(task.sourceId===sourceId)delete task.sourceId;
 for(const exam of workspace.studio?.exams||[])if(exam.sourceId===sourceId)delete exam.sourceId;
}
export function fingerprint(text:string){let h=2166136261;for(const c of text.trim().toLowerCase().replace(/\s+/g,' ')){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(16);}
function extractDates(text:string,referenceDate:string){
 const found:string[]=[],months=['january','february','march','april','may','june','july','august','september','october','november','december'];let ambiguous=false;
 for(const match of text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)){if(validDate(match[1]))found.push(match[1]);else ambiguous=true;}
 for(const match of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/g)){const a=Number(match[1]),b=Number(match[2]);if(a<=12&&b<=12&&a!==b){ambiguous=true;continue;}const day=a>12?a:b,month=a>12?b:a,value=match[3]+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');if(validDate(value))found.push(value);else ambiguous=true;}
 for(const match of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\s+(20\d{2})\b/gi)){const month=months.findIndex(m=>m===match[2].toLowerCase()||m.slice(0,3)===match[2].toLowerCase());if(month>=0){const value=match[3]+'-'+String(month+1).padStart(2,'0')+'-'+match[1].padStart(2,'0');if(validDate(value))found.push(value);else ambiguous=true;}}
 if(/\btomorrow\b/i.test(text))found.push(addDays(referenceDate,1));if(/\btoday\b/i.test(text))found.push(referenceDate);
 return {dates:[...new Set(found)],ambiguous};
}
export function explicitDeadline(text:string,referenceDate:string){
 const clockMentioned=/\b\d{1,2}[:.]\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(text);
 const revMatch=text.match(/\b(?:postpon(?:ed|ement)?|reschedul(?:ed|ing)?|revis(?:ed|ion)?|moved)\s+(?:from\s+)?(.*?)\s+(?:to|on|instead\s+of)\s+(.*)$/i);
 let supersededDate='',revisedDate='';
 if(revMatch){
  const target=extractDates(revMatch[2],referenceDate),old=extractDates(revMatch[1],referenceDate);
  if(target.dates.length===1)revisedDate=target.dates[0];
  if(old.dates.length===1)supersededDate=old.dates[0];
 }
 const all=extractDates(text,referenceDate);
 return {due:!all.ambiguous&&all.dates.length===1?all.dates[0]:'',revisedDate,supersededDate,ambiguous:all.ambiguous||all.dates.length>1,clockMentioned};
}
export function suggestFromMessage(source:Source,tasks:Task[],referenceDate:string,zone='Asia/Kolkata'):Suggestion[]{
 if(!/submit|submission|complete|assignment|record|exam|test|assessment|lab|timetable|deadline|codetantra|seminar|placement|hackathon/i.test(source.text))return [];
 const timetable=/exam|timetable|schedule of tests/i.test(source.text);
 return [...new Set(source.text.split(/\n+/).map(line=>line.trim()).filter(Boolean))].filter(line=>/submit|complete|assignment|record|exam|test|assessment|deadline|postpon|reschedul|lab|timetable|codetantra/i.test(line)||timetable&&/\b(?:20\d{2}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]20\d{2})\b/.test(line)).slice(0,30).map(line=>{
  const extracted=explicitDeadline(line,referenceDate),hint=deadlineHint(line,referenceDate,zone),due=extracted.ambiguous?'':extracted.due||hint.due;
  const title=line.trim().slice(0,240),keywords:string[]=[...new Set(title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[])];
  const correction=/\b(?:postpon(?:ed|ement)?|reschedul(?:ed|ing)?|cancel(?:led|ed)?|revis(?:ed|ion)|updated?|changed?|instead|not on)\b/i.test(line);
  const existing=tasks.filter(t=>t.category==='College'&&!t.archived).map(t=>{const words:string[]=t.title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];const overlap=keywords.filter(w=>words.includes(w)&&!['submit','submission','complete','students','please','record','before','tomorrow','today','postponed','rescheduled','cancelled','revised','updated','changed'].includes(w));return {t,overlap:overlap.length};}).sort((a,b)=>b.overlap-a.overlap||a.t.createdAt.localeCompare(b.t.createdAt)).find(v=>v.overlap>=(correction?1:2))?.t;
  const uncertain=hint.uncertain||/\b(maybe|might|think|probably|rumou?r|possibly)\b/i.test(line);
  const changeNote=correction&&existing?`Possible correction to “${existing.title}”${extracted.supersededDate?` (supersedes ${extracted.supersededDate})`:''}. Applying it will update that task only after your review. `:'';
  return {id:uid(),sourceId:source.id,title,due,...(hint.time?{dueTime:hint.time,dueZone:zone}:{}),confidence:due&&!uncertain?'date-found':'review',reason:changeNote+(extracted.ambiguous?'Ambiguous or conflicting dates. Confirm the intended deadline from the source.':(uncertain?'Uncertain wording. Verify with the original notice.':due?'Date found by local rules. Verify before applying.':'No unambiguous deadline. Enter a confirmed date; none was invented.'))+(extracted.clockMentioned?' Clock time is present in the source; NAV reminders currently use date-only deadlines. Verify that time separately.':''),...(existing?{existingTaskId:existing.id}:{})};
 });
}
