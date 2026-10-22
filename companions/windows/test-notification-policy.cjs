const assert=require('node:assert/strict');const {notificationPolicy,readAvailability}=require('./notification-policy.cjs');
function runner(global,app){return (exe,args,options,done)=>{assert.equal(options.windowsHide,true);assert.equal(options.timeout,2000);assert.equal(args[0],'query');assert.equal(args.length,4);const name=args[3],value=name==='ToastEnabled'?global:app;if(value===null)done(Error('Value absent'),'');else done(null,'\r\n    '+name+'    REG_DWORD    0x'+value.toString(16)+'\r\n');};}
(async()=>{
 assert.deepEqual(await notificationPolicy(runner(0,1)),{enabled:false,reason:'disabled-for-user'});
 assert.deepEqual(await notificationPolicy(runner(1,0)),{enabled:false,reason:'disabled-for-app'});
 assert.deepEqual(await notificationPolicy(runner(1,1),async()=>5),{enabled:true,reason:'allowed'});
 assert.deepEqual(await notificationPolicy(runner(null,null),async()=>null),{enabled:true,reason:'unknown'});
 for(const state of [1,2,3,4,6,7]){const result=await notificationPolicy(runner(1,1),async()=>state);assert.equal(result.enabled,false);assert.equal(result.deferred,true);}
 assert.equal(await readAvailability((_exe,args,options,done)=>{assert.equal(args[0],'-NoProfile');assert.equal(options.windowsHide,true);assert.equal(options.timeout,4000);assert(args.at(-1).includes('SHQueryUserNotificationState'));done(null,'2');}),2);
 assert.equal(await readAvailability((_exe,_args,_options,done)=>done(null,'unexpected private output')),null);
 assert.equal(await readAvailability((_exe,_args,_options,done)=>done(Error('unavailable'),'')),null);
 console.log('Notification permission checks passed: global/app suppression, allowed/default state and read-only bounded queries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
