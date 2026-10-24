import {build} from 'esbuild';import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
globalThis.Deno={env:{get:n=>({SUPABASE_URL:'https://db.invalid',SUPABASE_SECRET_KEYS:'{"default":"fixture-server-only"}'})[n]},serve(){}};
await build({entryPoints:['supabase/functions/nav-desktop/index.ts','supabase/functions/nav-phone-reminders/index.ts'],bundle:true,platform:'node',format:'cjs',outdir:'.sites-runtime/tests/negotiation',outExtension:{'.js':'.cjs'}});
const now=Date.now(),legacy={profile:{onboarded:true,timezone:'Asia/Kolkata',studyTime:'18:30'},tasks:[{id:'a',title:'Synthetic',date:'2026-10-24',due:'',status:'planned'}]},advanced={version:2,generatedAt:now,expiresAt:now+3600000,events:[{id:'2026-10-24:test',title:'NAV · Synthetic',body:'Test',at:now,until:now+600000}],truncated:false},modern={...legacy,advanced},scope='11111111-1111-4111-8111-111111111111';let snapshot=modern;
globalThis.fetch=async url=>{if(url.includes('links?'))return Response.json([{id:scope,user_id:'synthetic-owner',expires_at:new Date(now+86400000).toISOString()}]);if(url.includes('snapshots?'))return Response.json([{payload:snapshot,revision:3,updated_at:new Date(now).toISOString()}]);if(url.includes('nav_server_keys?'))return Response.json([{token_hash:'fixture'}]);return Response.json({saved:true});};
for(const [name,prefix] of [['nav-desktop','navw_'],['nav-phone-reminders','navp_']]){
 const {handler}=require('../.sites-runtime/tests/negotiation/'+name+'/index.cjs');
 const send=(protocol,op='read',server=false,body={})=>handler(new Request('https://relay.invalid/?op='+op,{method:'POST',headers:{Authorization:'Bearer '+(server?'navs_':prefix)+'a'.repeat(64),'Content-Type':'application/json',...(protocol?{'X-NAV-Reminder-Protocol':protocol}:{})},body:JSON.stringify(body)}));
 for(const protocol of [null,'1','unknown']){const r=await send(protocol);assert.equal(r.status,200);assert.deepEqual((await r.json()).data,legacy,'Old clients must receive exactly two fields and five task fields');}
 const modernResponse=await send('2');assert.equal(modernResponse.status,200);const result=await modernResponse.json();assert.deepEqual(result.data,modern);assert(!JSON.stringify(result).includes('synthetic-owner'));
 assert.equal((await send('2','publish')).status,403);
 assert.equal((await send('2','publish',true,{userId:'synthetic-owner',value:{revision:4,data:modern}})).status,200);
 const bad={...modern,advanced:{...advanced,events:[...advanced.events,advanced.events[0]]}};assert.equal((await send('2','publish',true,{userId:'synthetic-owner',value:{revision:4,data:bad}})).status,400);snapshot=bad;assert.equal((await send('2')).status,409);snapshot=legacy;assert.deepEqual((await (await send('2')).json()).data,legacy);snapshot=modern;
}
console.log('PASS: both relay handlers negotiate strict v1/v2, preserve owner/read-only scopes, reject malformed bundles and support rolling client/relay upgrades.');
