import {Source,Suggestion,Task,uid,validDate,addDays} from './model';
import type {Workspace} from './model';
export function findExtractedTask(tasks:Task[],sourceId:string|undefined,title:string){
 if(!sourceId)return undefined;
 const normalize=(value:string)=>value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return tasks.find(t=>!t.archived&&t.sourceId===sourceId&&normalize(t.title)===normalize(title));
}
export function removeImportedNotice(workspace:Workspace,sourceId:string){
 if(!workspace.sources.some(s=>s.id===sourceId))throw Error('This notice no longer exists. Reload your inbox.');
 workspace.sources=workspace.sources.filter(s=>s.id!==sourceId);
 workspace.suggestions=workspace.suggestions.filter(s=>s.sourceId!==sourceId);
 for(const task of workspace.tasks)if(task.sourceId===sourceId)delete task.sourceId;
}
export function fingerprint(text:string){let h=2166136261;for(const c of text.trim().toLowerCase().replace(/\s+/g,' ')){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(16);}
export function explicitDeadline(text:string,referenceDate:string){
 const found:string[]=[],months=['january','february','march','april','may','june','july','august','september','october','november','december'];let ambiguous=false;
 for(const match of text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)){if(validDate(match[1]))found.push(match[1]);else ambiguous=true;}
 for(const match of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/g)){const a=Number(match[1]),b=Number(match[2]);if(a<=12&&b<=12&&a!==b){ambiguous=true;continue;}const day=a>12?a:b,month=a>12?b:a,value=match[3]+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');if(validDate(value))found.push(value);else ambiguous=true;}
 for(const match of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\s+(20\d{2})\b/gi)){const month=months.findIndex(m=>m===match[2].toLowerCase()||m.slice(0,3)===match[2].toLowerCase());if(month>=0){const value=match[3]+'-'+String(month+1).padStart(2,'0')+'-'+match[1].padStart(2,'0');if(validDate(value))found.push(value);else ambiguous=true;}}
 if(/\btomorrow\b/i.test(text))found.push(addDays(referenceDate,1));if(/\btoday\b/i.test(text))found.push(referenceDate);
 const dates=[...new Set(found)];return {due:!ambiguous&&dates.length===1?dates[0]:'',ambiguous:ambiguous||dates.length>1,clockMentioned:/\b\d{1,2}[:.]\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(text)};
}
export function suggestFromMessage(source:Source,tasks:Task[],referenceDate:string):Suggestion[]{
 if(!/submit|submission|complete|assignment|record|exam|test|assessment|lab|timetable|deadline|codetantra|seminar|placement|hackathon/i.test(source.text))return [];
 const timetable=/exam|timetable|schedule of tests/i.test(source.text);
 return [...new Set(source.text.split(/\n+/).map(line=>line.trim()).filter(Boolean))].filter(line=>/submit|complete|assignment|record|exam|test|assessment|deadline|postpon|reschedul|lab|timetable|codetantra/i.test(line)||timetable&&/\b(?:20\d{2}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]20\d{2})\b/.test(line)).slice(0,30).map(line=>{
  const extracted=explicitDeadline(line,referenceDate),due=extracted.due;
  const title=line.trim().slice(0,240),keywords:string[]=[...new Set(title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[])];
  const existing=tasks.filter(t=>t.category==='College'&&!t.archived).find(t=>{const words:string[]=t.title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];const overlap=keywords.filter(w=>words.includes(w)&&!['submit','submission','complete','students','please','record','before','tomorrow','today'].includes(w));return overlap.length>=2;});
  const uncertain=/\b(maybe|might|think|probably|rumou?r|possibly)\b/i.test(line);
  return {id:uid(),sourceId:source.id,title,due,confidence:due&&!uncertain?'date-found':'review',reason:extracted.ambiguous?'Ambiguous or conflicting dates. Confirm the intended deadline from the source.':(uncertain?'Uncertain wording. Verify with the original notice.':due?'Date found by local rules. Verify before applying.':'No unambiguous deadline. Enter a confirmed date; none was invented.')+(extracted.clockMentioned?' Clock time is present in the source; NAV reminders currently use date-only deadlines. Verify that time separately.':''),...(existing?{existingTaskId:existing.id}:{})};
 });
}
