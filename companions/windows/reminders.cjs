function parts(now,zone){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};}
function nextDay(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function reminderEvents(workspace,now=new Date()){
 if(!workspace?.profile?.onboarded||!Array.isArray(workspace.tasks))return [];
 let today;try{today=parts(now,workspace.profile.timezone||'Asia/Kolkata')}catch{return []}
 const active=workspace.tasks.filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&t.status!=='done'&&!t.archived),events=[];
 const due=active.filter(t=>/^\d{4}-\d{2}-\d{2}$/.test(t.due||'')&&t.due<=nextDay(today.date)).sort((a,b)=>a.due.localeCompare(b.due));
 if(due.length&&today.time>='08:00')events.push({id:today.date+':deadlines',title:'NAV · Deadlines need attention',body:due.length===1?due[0].title+' · '+(due[0].due<today.date?'overdue':'due '+due[0].due):due.length+' unfinished tasks are due soon or overdue. Open NAV to review.',kind:'deadline'});
 const planned=active.filter(t=>t.date===today.date);
 if(planned.length&&/^([01]\d|2[0-3]):[0-5]\d$/.test(workspace.profile.studyTime||'')){
  const [h,m]=workspace.profile.studyTime.split(':').map(Number),[nh,nm]=today.time.split(':').map(Number),difference=nh*60+nm-(h*60+m);
  if(difference>=-10&&difference<=60)events.push({id:today.date+':study',title:'NAV · Your study plan is ready',body:planned.length+' tasks today. Start with '+planned[0].title.slice(0,120)+'.',kind:'study'});
 }
 return events;
}
module.exports={reminderEvents};
