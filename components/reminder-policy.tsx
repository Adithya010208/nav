'use client';
import {useState} from 'react';
import type {Workspace} from '@/lib/model';
import {editStudio} from '@/lib/studio';
import {defaultReminderPolicy,policyFromForm} from '@/lib/reminder-policy';
export default function ReminderPolicySettings({workspace:w,busy,commit}:{workspace:Workspace;busy:boolean;commit:(change:(draft:Workspace)=>void)=>Promise<boolean>}){
 const p=w.studio?.reminderPolicy||defaultReminderPolicy(),[status,setStatus]=useState('');
 return <section className="panel pad"><h2>Daily browser check-ins</h2><p>These optional reminders use your saved plan without calling AI. Keep NAV open in any section. Windows and Android retain their existing study and deadline alerts; the check-in policy below currently applies to this web app.</p>
 <form className="form-grid" key={JSON.stringify(p)} onSubmit={async e=>{e.preventDefault();try{const policy=policyFromForm(new FormData(e.currentTarget));if(await commit(d=>{editStudio(d).reminderPolicy=policy;}))setStatus('Check-in policy saved. Browser notification permission is enabled separately on each device.');else setStatus('Policy was not saved. Check the workspace sync error.');}catch(error){setStatus(error instanceof Error?error.message:'Check the reminder settings.');}}}>
 <label className="check-label"><input name="enabled" type="checkbox" defaultChecked={p.enabled}/>Enable scheduled browser check-ins</label>
 <label className="check-label"><input name="morningEnabled" type="checkbox" defaultChecked={p.morningEnabled}/>Morning task and deadline briefing</label><label>Morning time<input name="morning" type="time" required defaultValue={p.morning}/></label>
 <label className="check-label"><input name="eveningEnabled" type="checkbox" defaultChecked={p.eveningEnabled}/>Evening progress review</label><label>Evening time<input name="evening" type="time" required defaultValue={p.evening}/></label>
 <label className="check-label"><input name="missedEnabled" type="checkbox" defaultChecked={p.missedEnabled}/>Review older unfinished or explicitly missed tasks</label><label>Unfinished-work review time<input name="missed" type="time" required defaultValue={p.missed}/></label>
 <label>Catch-up window (minutes)<input name="graceMinutes" type="number" min={15} max={180} required defaultValue={p.graceMinutes}/></label>
 <label>Wait after a study slot ends before including its unfinished task (minutes)<input name="missedGraceMinutes" type="number" min={0} max={180} required defaultValue={p.missedGraceMinutes}/></label>
 <label className="check-label"><input name="quietEnabled" type="checkbox" defaultChecked={p.quietEnabled}/>Quiet hours for all NAV browser reminders when this policy is enabled</label><label>Quiet hours start<input name="quietStart" type="time" required defaultValue={p.quietStart}/></label><label>Quiet hours end<input name="quietEnd" type="time" required defaultValue={p.quietEnd}/></label>
 <p>Times use {w.profile.timezone}. Missed alerts concern planned work; overdue alerts concern deadlines. Quiet hours and closed pages can skip an alert after its catch-up window. During a repeated daylight-saving hour, check-ins use the first occurrence; a nonexistent clock time is skipped. No tasks move automatically.</p><button className="primary" disabled={busy}>Save check-in policy</button></form>{status&&<p role="status">{status}</p>}</section>;
}
