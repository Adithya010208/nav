const assert=require('node:assert/strict');
const {createPoller}=require('./poller.cjs');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
(async()=>{
 let enabled=true,loads=0,deliveries=[];let wait=deferred();
 const poller=createPoller({enabled:()=>enabled,load:()=>{loads++;return wait.promise;},deliver:x=>deliveries.push(x)});
 const first=poller.run();await Promise.resolve();assert.equal(await poller.run(),false);assert.equal(loads,1);
 poller.cancel();assert.equal(await first,false);wait.resolve('old account');await Promise.resolve();assert.deepEqual(deliveries,[]);
 wait=deferred();const disabled=poller.run();await Promise.resolve();enabled=false;wait.resolve('disabled');assert.equal(await disabled,false);assert.deepEqual(deliveries,[]);
 enabled=true;wait=deferred();const success=poller.run();await Promise.resolve();wait.resolve('current account');assert.equal(await success,true);assert.deepEqual(deliveries,['current account']);
 const timeout=createPoller({enabled:()=>true,timeoutMs:5,load:()=>new Promise(()=>{}),deliver:()=>assert.fail('timed-out request delivered')});
 assert.equal(await timeout.run(),false);assert.equal(await timeout.run(),false,'a timed out poll must release its lock');
 const failed=createPoller({enabled:()=>true,load:async()=>{throw Error('offline');},deliver:()=>assert.fail('offline request delivered')});assert.equal(await failed.run(),false);
 const throwing=createPoller({enabled:()=>true,load:async()=>1,deliver:()=>{throw Error('notification unavailable');}});assert.equal(await throwing.run(),false);
 const delivery=deferred();let asyncLoads=0;const asynchronous=createPoller({enabled:()=>true,load:async()=>{asyncLoads++;return 1;},deliver:()=>delivery.promise});const pending=asynchronous.run();await new Promise(r=>setImmediate(r));assert.equal(await asynchronous.run(),false);assert.equal(asyncLoads,1);delivery.resolve();assert.equal(await pending,true);
 const rejected=createPoller({enabled:()=>true,load:async()=>1,deliver:async()=>{throw Error('notification rejected');}});assert.equal(await rejected.run(),false);
 console.log('Windows poll checks passed: no overlap, cancellation, late-account rejection, disable, timeout recovery and offline/notification failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
