// Bounded, local RFC 5545 VEVENT snapshot import. No remote URLs, alarms, code or recurrence execution.
import {addDays,uid,validDate,type Workspace} from './model';
import {exactDeadline} from './deadlines';
export type CalendarEvent={id:string;title:string;start:string;end:string;calendarUid:string};
const decode=(s:string)=>s.replace(/\\[nN]/g,'\n').replace(/\\([,;\\])/g,'$1');
export function importCalendar(text:string,defaultZone:string){
 if(new TextEncoder().encode(text).length>1000000)throw Error('Calendar exceeds 1 MB.');
 if(!/^BEGIN:VCALENDAR\s*$/m.test(text.replace(/\r/g,''))||!text.includes('END:VCALENDAR'))throw Error('Choose an iCalendar VCALENDAR file.');
 const lines=text.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n'),events:CalendarEvent[]=[],warnings:string[]=[];let row:Record<string,{value:string;params:string}>=Object.create(null),depth=0,skip=false;
 const instant=(p:{value:string;params:string},end=false,startDate='')=>{const v=p.value;if(/^\d{8}$/.test(v)){const date=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);if(!validDate(date))throw Error('Invalid all-day date');return exactDeadline(date,'00:00',defaultZone);}
  const m=v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);if(!m||m[6]&&m[6]!=='00')throw Error('Unsupported calendar timestamp');const date=m[1]+'-'+m[2]+'-'+m[3],time=m[4]+':'+m[5];const zone=m[7]?'UTC':p.params.match(/(?:^|;)TZID="?([^;"]+)"?/)?.[1]||defaultZone;return exactDeadline(date,time,zone);};
 let encountered=0;
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){if(depth)throw Error('Nested events are invalid.');depth=1;row=Object.create(null);skip=false;if(++encountered>300)throw Error('Import at most 300 events.');continue;}
  if(!depth)continue;
  if(line.startsWith('BEGIN:')){depth++;continue;}
  if(line==='END:VEVENT'&&depth===1){depth=0;if(skip){warnings.push('Recurring, cancelled, transparent or overridden event skipped. Export individual occurrences if needed.');continue;}
   try{if(!row.DTSTART||!row.UID)throw Error('Missing UID or start');const start=instant(row.DTSTART),end=row.DTEND?instant(row.DTEND):/^\d{8}$/.test(row.DTSTART.value)?exactDeadline(addDays(row.DTSTART.value.slice(0,4)+'-'+row.DTSTART.value.slice(4,6)+'-'+row.DTSTART.value.slice(6,8),1),'00:00',defaultZone):'';if(!end||end<=start||row.UID.value.length>300)throw Error('Invalid event range');const title=decode(row.SUMMARY?.value||'Imported busy event').slice(0,240),calendarUid=row.UID.value;if(!events.some(e=>e.calendarUid===calendarUid&&e.start===start&&e.end===end))events.push({id:uid(),title,start,end,calendarUid});}
   catch{warnings.push('An event had missing, invalid or ambiguous dates/time zone and was skipped.');}continue;}
  if(line.startsWith('END:')){depth--;continue;}if(depth!==1)continue;
  const colon=line.indexOf(':');if(colon<1)continue;const head=line.slice(0,colon),key=head.split(';')[0].toUpperCase(),value=line.slice(colon+1);
  if(['RRULE','RDATE','EXDATE','RECURRENCE-ID','DURATION'].includes(key)||key==='STATUS'&&value==='CANCELLED'||key==='TRANSP'&&value==='TRANSPARENT')skip=true;
  if(Object.hasOwn(row,key)){skip=true;continue;}row[key]={value,params:head.slice(key.length)};
 }
 if(depth)throw Error('Incomplete calendar event.');return {events,warnings};
}
export function mergeCalendar(w:Workspace,events:CalendarEvent[]){if(!w.studio)throw Error('Initialize study tools first.');let added=0;for(const event of events){if(w.studio.busy.some(x=>x.calendarUid===event.calendarUid&&x.start===event.start&&x.end===event.end))continue;if(w.studio.busy.some(x=>x.calendarUid===event.calendarUid))throw Error('A calendar event changed. Review/remove its older snapshot before importing the replacement.');w.studio.busy.push(event);added++;}return added;}
