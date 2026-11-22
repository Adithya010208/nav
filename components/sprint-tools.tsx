'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {dateInZone,type Workspace} from '@/lib/model';
import {editStudio} from '@/lib/studio';
import {examCandidates,examFromForm,examLocal,examPlanStamp,prepareExams,saveExam,type Exam} from '@/lib/exams';
import {importCalendar,mergeCalendar} from '@/lib/calendar-import';
import {replacementSlots,applyReplacement,conflicts} from '@/lib/slots';
import {applyPriorities,type PriorityReview} from '@/lib/priorities';
type Props={workspace:Workspace;mode:string;busy:boolean;commit:(change:(draft:Workspace)=>void)=>Promise<boolean>};
export default function SprintTools({workspace:w,mode,busy,commit}:Props){
 const [formVersion,setFormVersion]=useState(0),[status,setStatus]=useState(''),[selectedSource,setSource]=useState(''),[candidates,setCandidates]=useState<ReturnType<typeof examCandidates>>([]),[examDraft,setExam]=useState<Exam|null>(null),[candidate,setCandidate]=useState<{subject:string;date:string;start:string}|null>(null),[plan,setPlan]=useState<ReturnType<typeof prepareExams>|null>(null);
 const [ics,setICS]=useState(''),[remoteUrl,setRemoteUrl]=useState(''),[syncing,setSyncing]=useState(false),[webcalCopied,setWebcalCopied]=useState(false),[calendar,setCalendar]=useState<ReturnType<typeof importCalendar>|null>(null),[alternatives,setAlternatives]=useState<ReturnType<typeof replacementSlots>|null>(null);
 const [provider,setProvider]=useState<{configured:boolean;provider:string;providerLabel:string}|null>(null),[review,setReview]=useState<PriorityReview|null>(null),[chosen,setChosen]=useState<string[]>([]),[asking,setAsking]=useState(false);
 const exams=w.studio?.exams||[],today=dateInZone(w.profile.timezone);
 useEffect(()=>{if(mode!=='Priority review')return;const c=new AbortController();void fetch('/api/assistant',{signal:c.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{configured:boolean;provider:string;providerLabel:string}>;}).then(setProvider).catch(()=>{if(!c.signal.aborted)setStatus('AI configuration could not be checked.');});return()=>c.abort();},[mode]);
 async function save(change:(draft:Workspace)=>void,message:string){try{if(await commit(change)){setStatus(message);return true;}setStatus('Not saved. Review the workspace sync error.');}catch(e){setStatus(e instanceof Error?e.message:'Changes could not be saved.');}return false;}
 function data(e:FormEvent<HTMLFormElement>){e.preventDefault();return new FormData(e.currentTarget);}
 const local=examDraft?{...examLocal(examDraft),subject:examDraft.subject}:candidate?{...candidate,end:'10:00'}:{date:today,start:'09:00',end:'10:00',subject:''};
 return <section className="notice"><h3>{mode}</h3>{status&&<p role="status">{status}</p>}
 {mode==='Exams'&&<>
  <p>Review subject, clock times and time zone before saving. Source text is a hint, never an instruction. Preparation plans are previews until explicitly applied.</p>
  <label>Exam source<select value={selectedSource} onChange={e=>setSource(e.target.value)}><option value="">Manual entry</option>{w.sources.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label>
  <button className="secondary" disabled={!selectedSource} onClick={()=>{const source=w.sources.find(s=>s.id===selectedSource);if(source){setCandidates(examCandidates(source,w.profile.timezone));setStatus('Candidate lines only. Confirm each subject and both times.');}}}>Preview exams from source</button>
  {candidates.map((c,i)=><article key={i} className="notice"><p>{c.line}</p><small>{c.uncertain?'One or more timetable values need confirmation. ':''}{c.reason}</small><button onClick={()=>{setExam(null);setCandidate({subject:c.subject,date:c.date,start:c.start});}}>Review this exam</button></article>)}
  <form className="form-grid" key={formVersion+':'+(examDraft?.id||JSON.stringify(candidate))} onSubmit={e=>{const f=data(e);if(f.get('confirmed')!=='on')return setStatus('Confirm the original timetable before saving.');try{const exam=examFromForm(f,w.profile.timezone);void save(d=>{editStudio(d);saveExam(d,exam);},'Exam saved. Existing preparation tasks are preserved; review their deadlines if the exam changed.').then(ok=>{if(ok){setExam(null);setCandidate(null);setPlan(null);setFormVersion(n=>n+1);}});}catch(error){setStatus(error instanceof Error?error.message:'Check the exam.');}}}>
   <input type="hidden" name="id" value={examDraft?.id||''}/><input type="hidden" name="sourceId" value={examDraft?.sourceId||selectedSource}/>
   <label>Exam subject<input name="subject" required maxLength={240} defaultValue={examDraft?.subject||local.subject}/></label>
   <label>Exam date<input name="date" type="date" required defaultValue={local.date}/></label>
   <label>Exam starts<input name="start" type="time" required defaultValue={local.start}/></label>
   <label>Exam ends<input name="end" type="time" required defaultValue={examDraft?local.end:'10:00'}/></label>
   <label>Exam time zone<input name="timezone" required defaultValue={examDraft?.timezone||w.profile.timezone}/></label>
   <label>Exam type<input name="kind" maxLength={80} defaultValue={examDraft?.kind||'Exam'}/></label>
   <label>Exam location<input name="location" maxLength={240} defaultValue={examDraft?.location||''}/></label>
   <label>Difficulty (1 easy–5 hard)<input name="difficulty" type="number" min={1} max={5} defaultValue={examDraft?.difficulty||3}/></label>
   <label>Confidence (1 low–5 high)<input name="confidence" type="number" min={1} max={5} defaultValue={examDraft?.confidence||3}/></label>
   <label>Related milestones<select name="topics" multiple defaultValue={examDraft?.topicIds||[]}>{w.topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
   <label className="check-label"><input type="checkbox" name="confirmed" required/>I verified this exam and its time zone against the timetable.</label><button className="primary" disabled={busy}>Save reviewed exam</button>
  </form>
  {exams.slice().sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).map(exam=>{const tasks=w.tasks.filter(t=>!t.archived&&t.notes.startsWith('exam:'+exam.id+':')),times=examLocal(exam);return <article className="notice" key={exam.id}><h4>{exam.subject}</h4><p>{times.date} · {times.start}–{times.end} · {exam.timezone}</p><p>{exam.kind} · {exam.location||'No location supplied'} · {Math.max(0,Math.ceil((Date.parse(exam.startsAt)-Date.now())/86400000))} days away</p><p>{tasks.filter(t=>t.status==='done').length}/{tasks.length} preparation tasks complete</p>{exam.sourceId&&<details><summary>Original source</summary><p style={{whiteSpace:'pre-wrap'}}>{w.sources.find(s=>s.id===exam.sourceId)?.text||'Source unavailable'}</p></details>}<button className="secondary" onClick={()=>{setExam(exam);setCandidate(null);}}>Edit exam</button></article>;})}
  <button className="secondary" disabled={busy||!exams.length} onClick={()=>{try{setPlan(prepareExams(w));setStatus('Preview uses saved capacity, busy events, study slots and prerequisites. No tasks changed.');}catch(e){setStatus(e instanceof Error?e.message:'Planning failed.');}}}>Preview exam preparation</button>
  {plan&&<><p>{plan.tasks.length} new preparation tasks</p>{plan.tasks.map(t=><p key={t.id}>{t.date} · {t.title} · {t.minutes} minutes</p>)}{plan.warnings.map((t,i)=><p key={i} role="alert">{t}</p>)}<button className="primary" disabled={busy||!plan.tasks.length} onClick={()=>void save(d=>{if(examPlanStamp(d)!==plan.stamp)throw Error('Exam or schedule changed. Preview preparation again.');if(plan.slots.some(s=>Date.parse(s.start)<Date.now()))throw Error('A previewed session start has passed. Preview again.');d.tasks.push(...plan.tasks);editStudio(d).slots.push(...plan.slots);},'Preparation tasks and conflict-free slots saved.').then(ok=>{if(ok)setPlan(null);})}>Apply reviewed preparation</button></>}
 </>}
 {mode==='Priority review'&&<>
  <p>Ask what to work on first. NAV shares up to 80 pending task records, milestone prerequisites and busy times with {provider?.providerLabel||'your configured AI provider'}. It returns an order and reasons; it cannot save task changes.</p>
  <form onSubmit={async e=>{const f=data(e);if(!provider||f.get('approve')!=='on')return;setAsking(true);setReview(null);setChosen([]);try{const r=await fetch('/api/priorities',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(40000),body:JSON.stringify({provider:provider.provider,consent:true,approveProviderCall:true,taskIds:f.getAll('taskIds').map(String)})}),j=await r.json() as PriorityReview&{error:string};if(!r.ok)throw Error(j.error);setReview(j);setStatus('Review the comparison, select changes, then explicitly apply. Nothing has changed.');}catch(error){setStatus(error instanceof Error?error.message:'AI priority review failed.');}finally{setAsking(false);}}}>
   <label>Tasks to prioritize (leave empty for all pending)<select name="taskIds" multiple>{w.tasks.filter(t=>!t.archived&&t.status!=='done').map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select></label><label className="check-label"><input name="approve" type="checkbox" required disabled={asking}/>I approve sharing this context and one potentially billable provider call, counted toward my daily AI allowance.</label><button className="primary" disabled={busy||asking||!provider?.configured}>{asking?'Reviewing priorities…':'Ask AI what to work on first'}</button>
  </form>{review&&<><p>{review.summary}</p>{review.proposals.map(p=><article className="notice" key={p.taskId}><label className="check-label"><input type="checkbox" checked={chosen.includes(p.taskId)} onChange={e=>setChosen(ids=>e.target.checked?[...ids,p.taskId]:ids.filter(id=>id!==p.taskId))}/>{p.rank}. {p.expected.title}</label><p>Current priority {p.expected.priority} → proposed {p.priority}</p><p>{p.reason}</p></article>)}<button className="primary" disabled={busy||!chosen.length} onClick={()=>void save(d=>{applyPriorities(d,review,chosen);},'Selected priorities saved. No dates or task contents changed.').then(ok=>{if(ok){setReview(null);setChosen([]);}})}>Apply selected priority changes</button></>}
 </>}
 {mode==='Calendar import'&&<>
  <p>Universal calendar integration. Subscribe external calendar apps (Google, Apple, Outlook) to your live NAV schedule via WebCal, or sync remote .ics calendar feeds with automatic conflict detection.</p>
  <article className="notice">
   <h4>Live WebCal subscription feed</h4>
   <p>Subscribe in Apple Calendar, Google Calendar, or Microsoft Outlook to see your live study slots, deadlines, and exams automatically:</p>
   <div className="row">
    <input readOnly value={typeof window!=='undefined'?window.location.origin+'/api/calendar':''}/>
    <button className="secondary" onClick={()=>{if(typeof window!=='undefined'){navigator.clipboard.writeText(window.location.origin+'/api/calendar');setWebcalCopied(true);setTimeout(()=>setWebcalCopied(false),3000);}}}>{webcalCopied?'Copied!':'Copy WebCal feed URL'}</button>
    <a className="secondary" href={typeof window!=='undefined'?'webcal://'+window.location.host+'/api/calendar':'#'} role="button">Subscribe directly</a>
   </div>
  </article>
  <article className="notice">
   <h4>Remote calendar feed sync (.ics / WebCal link)</h4>
   <p>Fetch your university timetable or external calendar feed with SSRF protection. NAV merges busy appointments and detects clashes with your study sessions.</p>
   <div className="row">
    <input type="url" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" value={remoteUrl} onChange={e=>setRemoteUrl(e.target.value)} maxLength={1000}/>
    <button className="primary" disabled={busy||syncing||!remoteUrl} onClick={async()=>{setSyncing(true);setStatus('Fetching remote calendar...');try{const r=await fetch('/api/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:remoteUrl})});const d=await r.json() as {ok?:boolean;added?:number;skippedDuplicates?:number;error?:string;conflictingSlots?:unknown[]};if(!r.ok)throw Error(d.error||'Failed to sync remote calendar.');setStatus(`Synced: ${d.added||0} events added (${d.skippedDuplicates||0} duplicates skipped). ${d.conflictingSlots?.length?d.conflictingSlots.length+' study slots conflict. Review replacements below.':''}`);setRemoteUrl('');}catch(e){setStatus(e instanceof Error?e.message:'Calendar sync failed.');}finally{setSyncing(false);}}}>{syncing?'Syncing...':'Sync remote calendar'}</button>
   </div>
  </article>
  <h4>Local .ics snapshot import</h4>
  <p>Upload a local .ics calendar file or paste calendar text to merge busy events:</p>
  <label>Calendar file<input type="file" accept=".ics,text/calendar" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1000000)return setStatus('Choose a calendar below 1 MB.');setICS(await file.text());setCalendar(null);}}/></label>
  <label>Calendar text<textarea value={ics} maxLength={1000000} onChange={e=>{setICS(e.target.value);setCalendar(null);}}/></label><button className="secondary" disabled={busy||!ics} onClick={()=>{try{setCalendar(importCalendar(ics,w.profile.timezone));setStatus('Snapshot preview only. Floating/all-day dates use '+w.profile.timezone+'.');}catch(e){setStatus(e instanceof Error?e.message:'Invalid calendar.');}}}>Preview calendar import</button>
  {calendar&&<>{calendar.warnings.map((t,i)=><p key={i} role="alert">{t}</p>)}{calendar.events.map(e=><p key={e.id}>{e.title} · {new Date(e.start).toLocaleString()}–{new Date(e.end).toLocaleString()}</p>)}<button className="primary" disabled={busy||!calendar.events.length} onClick={()=>void save(d=>{editStudio(d);mergeCalendar(d,calendar.events);},'Calendar snapshot saved as busy events; duplicate occurrences skipped.').then(ok=>{if(ok)setCalendar(null);})}>Save reviewed busy events</button></>}
  <h4>Resolve saved schedule conflicts</h4>{conflicts(w).map((c,i)=><p key={i} role="alert">{c.a.label} overlaps {c.b.label}</p>)}<form className="form-grid" onSubmit={e=>{const f=data(e);try{setAlternatives(replacementSlots(w,String(f.get('date')),new Date(String(f.get('start'))).toISOString(),new Date(String(f.get('end'))).toISOString()));setStatus('Alternative slots only. Existing appointments are never moved.');}catch(error){setStatus(error instanceof Error?error.message:'Choose a valid window.');}}}>
   <label>Conflict review day<input type="date" name="date" defaultValue={today} required/></label><label>Alternative window starts<input type="datetime-local" name="start" required/></label><label>Alternative window ends<input type="datetime-local" name="end" required/></label><button className="secondary" disabled={busy}>Suggest conflict-free replacements</button>
  </form>{alternatives&&<><p>{alternatives.replaced.length} conflicting slots replaced only if you apply; {alternatives.unplaced.length} tasks cannot fit.</p>{alternatives.slots.map(s=><p key={s.id}>{w.tasks.find(t=>t.id===s.taskId)?.title} · {new Date(s.start).toLocaleString()}</p>)}<button className="primary" disabled={busy||!alternatives.replaced.length} onClick={()=>void save(d=>applyReplacement(d,alternatives),'Reviewed study slots replaced. Calendar appointments unchanged.').then(ok=>{if(ok)setAlternatives(null);})}>Apply reviewed conflict resolution</button></>}
 </>}
 </section>;
}
