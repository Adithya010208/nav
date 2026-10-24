const RELAY='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-desktop';
function parseSetup(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>4096)throw Error('Invalid setup file.');
 const v=JSON.parse(text);if(v.format!=='nav-windows-setup'||v.version!==1||v.relayUrl!==RELAY||typeof v.deviceToken!=='string'||!/^navw_[a-f0-9]{64}$/.test(v.deviceToken)||typeof v.deviceId!=='string'||!/^[a-f0-9-]{36}$/.test(v.deviceId)||typeof v.expiresAt!=='string'||!Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=Date.now()||Date.parse(v.expiresAt)>Date.now()+31*86400000||Object.keys(v).some(k=>!['format','version','relayUrl','deviceToken','deviceId','expiresAt'].includes(k)))throw Error('Invalid or expired NAV Windows setup.');
 return {format:v.format,version:1,relayUrl:RELAY,deviceToken:v.deviceToken,deviceId:v.deviceId,expiresAt:v.expiresAt};
}
function validReply(j){
 if(j?.data?.advanced!==undefined&&!require('./advanced-reminders.cjs').validBundle(j.data.advanced))throw Error('Invalid advanced reminder plan.');
 if(!j||typeof j.scope!=='string'||!/^[a-f0-9-]{36}$/.test(j.scope)||!Number.isSafeInteger(j.revision)||j.revision<0||!Number.isFinite(Date.parse(j.updatedAt))||!j.data?.profile||!Array.isArray(j.data.tasks)||j.data.tasks.length>3000)throw Error('Invalid reminder response.');
 const p=j.data.profile;try{new Intl.DateTimeFormat('en',{timeZone:p.timezone});}catch{throw Error('Invalid reminder time zone.');}if(typeof p.onboarded!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.studyTime))throw Error('Invalid reminder profile.');
 for(const t of j.data.tasks)if(!t||typeof t.id!=='string'||t.id.length>100||typeof t.title!=='string'||t.title.length>160||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||typeof t.due!=='string'||(t.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(t.due))||!['planned','partial','missed'].includes(t.status))throw Error('Invalid reminder task.');
 return j;
}
async function readReminders(setup,signal,fetcher=fetch){
 if(Date.parse(setup.expiresAt)<=Date.now())throw Object.assign(Error('Reconnect Windows from browser Settings.'),{status:401});
 const r=await fetcher(RELAY+'?op=read',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+setup.deviceToken,'X-NAV-Reminder-Protocol':'2'},body:'{}',redirect:'error',signal});
 if(!r.ok)throw Object.assign(Error('Reminder connection unavailable.'),{status:r.status});
 const reader=r.body?.getReader();if(!reader)throw Error('Missing reminder response.');let size=0,text='';const decoder=new TextDecoder();while(true){const n=await reader.read();if(n.done)break;size+=n.value.length;if(size>1250000){await reader.cancel();throw Error('Reminder response too large.');}text+=decoder.decode(n.value,{stream:true});}const j=validReply(JSON.parse(text+decoder.decode()));if(j.scope!==setup.deviceId)throw Error('Reminder connection mismatch.');return j;
}
module.exports={RELAY,parseSetup,validReply,readReminders};
