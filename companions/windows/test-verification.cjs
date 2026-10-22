const assert=require('node:assert/strict');const {createVerification}=require('./verification.cjs');const {createPoller}=require('./poller.cjs');
(async()=>{let now=1000000,permitted=false,shown=0,loads=0;const verification=createVerification(()=>now);const due=verification.schedule();assert.equal(Date.parse(due),now+60000);assert.equal(verification.event(),null);
 const poller=createPoller({enabled:()=>true,load:async()=>{loads++;return {fixture:true};},deliver:async(data,signal)=>{assert(data.fixture);const event=verification.event();if(event&&permitted&&!signal.aborted){shown++;verification.accepted(event.id);}}});
 await poller.run();assert.equal(shown,0);now+=60000;await poller.run();assert(verification.event(),'suppressed test stays pending');assert.equal(shown,0);permitted=true;await poller.run();assert.equal(shown,1);assert.equal(verification.event(),null);await poller.run();assert.equal(shown,1);assert.equal(loads,4);
 verification.schedule();now+=700000;assert.equal(verification.event(),null);assert.equal(verification.dueAt(),null);
 verification.schedule();const first=verification.dueAt();now+=1;verification.schedule();verification.accepted('verification:'+Date.parse(first));assert(verification.dueAt(),'old acknowledgement cannot clear a newer test');
 console.log('Scheduled verification checks passed: real poll integration, one-minute delay, suppression retry, exactly-once acceptance, bounded expiry and stale acknowledgement isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
