const assert=require('node:assert/strict');const {parseSetup,readReminders,RELAY}=require('./connection.cjs');
const setup={format:'nav-windows-setup',version:1,relayUrl:RELAY,deviceId:'11111111-1111-4111-8111-111111111111',deviceToken:'navw_'+'a'.repeat(64),expiresAt:new Date(Date.now()+86400000).toISOString()};
const snapshot={scope:setup.deviceId,revision:4,updatedAt:new Date().toISOString(),data:{profile:{onboarded:true,timezone:'Asia/Kolkata',studyTime:'18:30'},tasks:[{id:'fixture',title:'Study maths',date:'2026-10-22',due:'',status:'planned'}]}};
(async()=>{
 assert.deepEqual(parseSetup(JSON.stringify(setup)),setup);
 for(const change of [{deviceToken:'navs_'+'a'.repeat(64)},{deviceToken:'navd_'+'a'.repeat(64)},{relayUrl:'https://attacker.invalid'},{serviceToken:'fixture'},{expiresAt:'invalid'},{expiresAt:new Date(0).toISOString()}])assert.throws(()=>parseSetup(JSON.stringify({...setup,...change})));
 let calls=0;const fetcher=async(url,o)=>{calls++;assert.equal(url,RELAY+'?op=read');assert.equal(o.redirect,'error');assert.equal(o.headers.Authorization,'Bearer '+setup.deviceToken);assert.equal(o.body,'{}');return Response.json(snapshot);};assert.deepEqual(await readReminders(setup,new AbortController().signal,fetcher),snapshot);assert.equal(calls,1);
 await assert.rejects(()=>readReminders(setup,null,async()=>Response.json({...snapshot,scope:'22222222-2222-4222-8222-222222222222'})));
 await assert.rejects(()=>readReminders(setup,null,async()=>Response.json({...snapshot,data:{...snapshot.data,tasks:[{...snapshot.data.tasks[0],title:4}]}})));
 await assert.rejects(()=>readReminders(setup,null,async()=>new Response('',{status:401})),e=>e.status===401);
 let cancelled=false;await assert.rejects(()=>readReminders(setup,null,async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(1250001));},cancel(){cancelled=true;}}))));assert.equal(cancelled,true);
 console.log('Windows connection checks passed: scoped credential only, fixed destination, expiry, owner binding, bounded response, malformed plan and revoked access.');
})().catch(e=>{console.error(e);process.exitCode=1;});
