// Version 2 carries bounded, precomputed notification windows. It never grants write access.
export type NativeReminderEvent={id:string;title:string;body:string;at:number;until:number};
export type NativeReminderBundle={version:2;generatedAt:number;expiresAt:number;events:NativeReminderEvent[];truncated:boolean};
const keys=(v:any,names:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&Object.keys(v).every(k=>names.includes(k));
function day(v:any){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function validBundle(v:any):v is NativeReminderBundle{
 return keys(v,['version','generatedAt','expiresAt','events','truncated'])&&v.version===2&&Number.isSafeInteger(v.generatedAt)&&v.generatedAt>0&&Number.isSafeInteger(v.expiresAt)&&v.expiresAt>v.generatedAt&&v.expiresAt<=v.generatedAt+72*3600000&&typeof v.truncated==='boolean'&&Array.isArray(v.events)&&v.events.length<=500&&new Set(v.events.map((e:any)=>e?.id)).size===v.events.length&&v.events.every((e:any)=>keys(e,['id','title','body','at','until'])&&typeof e.id==='string'&&/^\d{4}-\d{2}-\d{2}:/.test(e.id)&&e.id.length<=240&&day(e.id.slice(0,10))&&typeof e.title==='string'&&e.title.length>0&&e.title.length<=100&&typeof e.body==='string'&&e.body.length<=500&&Number.isSafeInteger(e.at)&&Number.isSafeInteger(e.until)&&e.at>=v.generatedAt-24*3600000&&e.until>e.at&&e.until<=v.expiresAt&&e.until-e.at<=72*3600000);
}
export function validReminderSnapshot(d:any){
 if(!keys(d,d?.advanced===undefined?['profile','tasks']:['profile','tasks','advanced'])||!keys(d.profile,['onboarded','timezone','studyTime'])||typeof d.profile.onboarded!=='boolean'||typeof d.profile.timezone!=='string'||d.profile.timezone.length>100||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.studyTime)||!Array.isArray(d.tasks)||d.tasks.length>3000)return false;
 try{new Intl.DateTimeFormat('en',{timeZone:d.profile.timezone});}catch{return false;}
 if(!d.tasks.every((t:any)=>keys(t,['id','title','date','due','status'])&&typeof t.id==='string'&&t.id.length>0&&t.id.length<=100&&typeof t.title==='string'&&t.title.length<=160&&day(t.date)&&(t.due===''||day(t.due))&&['planned','partial','missed'].includes(t.status)))return false;
 return d.advanced===undefined||validBundle(d.advanced);
}
export function snapshotForProtocol(d:any,protocol:string|null){return protocol==='2'?d:{profile:d.profile,tasks:d.tasks};}
