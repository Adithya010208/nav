import {Source,Suggestion,Task,uid,validDate,addDays} from './model';
export function fingerprint(text:string){let h=2166136261;for(const c of text.trim().toLowerCase().replace(/\s+/g,' ')){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(16);}
export function suggestFromMessage(source:Source,tasks:Task[],referenceDate:string):Suggestion[]{
 if(!/submit|submission|complete|assignment|record|exam|test|assessment|lab|timetable|deadline|codetantra|seminar|placement|hackathon/i.test(source.text))return [];
 return source.text.split(/\n+/).filter(line=>/submit|complete|assignment|record|exam|test|assessment|deadline|postpon|reschedul|lab|timetable|codetantra/i.test(line)).slice(0,30).map(line=>{
  let due='';const exact=line.match(/\b(20\d{2}-\d{2}-\d{2})\b/);if(exact&&validDate(exact[1]))due=exact[1];
  if(!due&&/\btomorrow\b/i.test(line))due=addDays(referenceDate,1);else if(!due&&/\btoday\b/i.test(line))due=referenceDate;
  const title=line.trim().slice(0,240),keywords:string[]=title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];
  const existing=tasks.filter(t=>t.category==='College'&&!t.archived).find(t=>{const words:string[]=t.title.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];const overlap=keywords.filter(w=>words.includes(w)&&!['submit','submission','complete','students','please','record','before','tomorrow','today'].includes(w));return overlap.length>=2;});
  const uncertain=/\b(maybe|might|think|probably|rumou?r|possibly)\b/i.test(line);
  return {id:uid(),sourceId:source.id,title,due,confidence:due&&!uncertain?'date-found':'review',reason:uncertain?'Uncertain wording. Verify with the original notice.':due?'Date found by local rules. Verify before applying.':'No unambiguous deadline. Enter a confirmed date; none was invented.',...(existing?{existingTaskId:existing.id}:{})};
 });
}
