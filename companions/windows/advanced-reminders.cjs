function validDay(v){const n=Date.parse(v+'T12:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v;}
// Keep this bounded contract aligned with supabase/functions/_shared/reminder-protocol.ts.
const keys=(v,names)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&Object.keys(v).every(k=>names.includes(k));
function validBundle(v){return keys(v,['version','generatedAt','expiresAt','events','truncated'])&&v.version===2&&Number.isSafeInteger(v.generatedAt)&&v.generatedAt>0&&Number.isSafeInteger(v.expiresAt)&&v.expiresAt>v.generatedAt&&v.expiresAt<=v.generatedAt+72*3600000&&typeof v.truncated==='boolean'&&Array.isArray(v.events)&&v.events.length<=500&&new Set(v.events.map(e=>e?.id)).size===v.events.length&&v.events.every(e=>keys(e,['id','title','body','at','until'])&&typeof e.id==='string'&&/^\d{4}-\d{2}-\d{2}:/.test(e.id)&&e.id.length<=240&&validDay(e.id.slice(0,10))&&typeof e.title==='string'&&e.title.length>0&&e.title.length<=100&&typeof e.body==='string'&&e.body.length<=500&&Number.isSafeInteger(e.at)&&Number.isSafeInteger(e.until)&&e.at>=v.generatedAt-24*3600000&&e.until>e.at&&e.until<=v.expiresAt&&e.until-e.at<=72*3600000);}
function advancedEvents(bundle,now=new Date()){
 const at=now.getTime();if(!validBundle(bundle)||bundle.generatedAt>at+60000||bundle.expiresAt<=at)return [];
 return bundle.events.filter(e=>e.at<=at&&at<e.until).map(e=>({id:e.id,title:e.title,body:e.body,kind:'scheduled'}));
}
module.exports={validBundle,advancedEvents};
