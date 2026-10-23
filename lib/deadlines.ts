import {addDays,dateInZone,validDate,type Task} from './model';
export function validZone(zone:string){try{new Intl.DateTimeFormat('en',{timeZone:zone});return true;}catch{return false;}}
export function clockInZone(instant:string,zone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));}
/** Return all real instants for a wall-clock minute: zero in a DST gap, two in a fold. */
export function wallInstants(date:string,time:string,zone:string){
 if(!validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!validZone(zone))throw Error('Choose a valid date, time and IANA time zone.');
 const nominal=Date.parse(date+'T'+time+':00Z'),offsets=new Set<number>();
 for(const hours of [-36,-12,0,12,36]){const instant=nominal+hours*3600000,day=dateInZone(zone,new Date(instant)),clock=clockInZone(new Date(instant).toISOString(),zone);offsets.add(Date.parse(day+'T'+clock+':00Z')-instant);}
 return [...offsets].map(offset=>new Date(nominal-offset).toISOString()).filter(instant=>dateInZone(zone,new Date(instant))===date&&clockInZone(instant,zone)===time).sort();
}
export function exactDeadline(date:string,time:string,zone:string,fold='reject'){
 const choices=wallInstants(date,time,zone);if(!choices.length)throw Error('That local time does not exist because clocks change. Choose another time.');
 if(choices.length>1&&!['earlier','later'].includes(fold))throw Error('That clock time occurs twice. Explicitly choose the earlier or later occurrence.');
 return choices[fold==='later'?choices.length-1:0];
}
export function deadlineFields(form:FormData,fallbackZone:string){
 const due=String(form.get('due')||''),time=String(form.get('dueTime')||'');
 if(!time)return {due,dueAt:undefined,dueZone:undefined,advanceMinutes:undefined};
 if(form.get('confirmDeadline')!=='on')throw Error('Confirm the exact deadline date, clock time and time zone before saving.');
 const dueZone=String(form.get('dueZone')||fallbackZone),advanceMinutes=Number(form.get('advanceMinutes')||60);
 if(!Number.isInteger(advanceMinutes)||advanceMinutes<0||advanceMinutes>10080)throw Error('Advance warning must be 0–10080 minutes.');
 return {due,dueAt:exactDeadline(due,time,dueZone,String(form.get('fold')||'reject')),dueZone,advanceMinutes};
}
export function deadlineOverdue(task:Pick<Task,'due'|'dueAt'>,zone:string,now=new Date()){return task.dueAt?Date.parse(task.dueAt)<now.getTime():!!task.due&&task.due<dateInZone(zone,now);}
export function deadlineHint(text:string,referenceDate:string,zone:string){
 let due='',uncertain=false;const dates:string[]=[];
 for(const m of text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g))if(validDate(m[1]))dates.push(m[1]);else uncertain=true;
 for(const m of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/g)){const a=+m[1],b=+m[2];if(a<=12&&b<=12&&a!==b){uncertain=true;continue;}const d=m[3]+'-'+String(a>12?b:a).padStart(2,'0')+'-'+String(a>12?a:b).padStart(2,'0');if(validDate(d))dates.push(d);else uncertain=true;}
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 for(const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(20\d{2}))?\b/gi)){const month=months.findIndex(x=>x===m[2].toLowerCase()||x.slice(0,3)===m[2].toLowerCase());if(month<0)continue;const d=(m[3]||referenceDate.slice(0,4))+'-'+String(month+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');if(validDate(d))dates.push(d);else uncertain=true;}
 if(/\btomorrow\b/i.test(text))dates.push(addDays(referenceDate,1));else if(/\btoday\b/i.test(text))dates.push(referenceDate);
 const weekday=text.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
 if(weekday&&!dates.length){const target=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday[1].toLowerCase()),current=new Date(referenceDate+'T12:00:00Z').getUTCDay();dates.push(addDays(referenceDate,(target-current+7)%7));uncertain=true;}
 const unique=[...new Set(dates)];if(unique.length===1)due=unique[0];if(unique.length>1){due='';uncertain=true;}
 const times=[...text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi)].map(m=>{const h=+m[1],minute=+(m[2]||0);return h>=1&&h<=12&&minute<60?String(h%12+(/^p/i.test(m[3])?12:0)).padStart(2,'0')+':'+String(minute).padStart(2,'0'):'';});
 if(!times.length)for(const m of text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g))times.push(m[1].padStart(2,'0')+':'+m[2]);
 const clocks=[...new Set(times.filter(Boolean))];const time=clocks.length===1?clocks[0]:'';if(clocks.length>1)uncertain=true;
 const foreign=/\b(?:IST|EST|EDT|CST|CDT|PST|PDT|BST)\b/.test(text);if(foreign)uncertain=true; // Abbreviations are ambiguous; never silently infer a zone.
 return {due,time,zone,uncertain,wording:text.slice(0,1000),reason:foreign?'Time-zone abbreviation needs explicit confirmation.':uncertain?'Date or time is ambiguous; confirm against the source.':'Review the original date, clock time and workspace time zone before saving.'};
}
