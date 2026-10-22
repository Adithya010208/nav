const assert=require('node:assert/strict');const {notificationPolicy}=require('./notification-policy.cjs');
function runner(global,app){return (exe,args,options,done)=>{assert.equal(options.windowsHide,true);assert.equal(options.timeout,2000);assert.equal(args[0],'query');assert.equal(args.length,4);const name=args[3],value=name==='ToastEnabled'?global:app;if(value===null)done(Error('Value absent'),'');else done(null,'\r\n    '+name+'    REG_DWORD    0x'+value.toString(16)+'\r\n');};}
(async()=>{
 assert.deepEqual(await notificationPolicy(runner(0,1)),{enabled:false,reason:'disabled-for-user'});
 assert.deepEqual(await notificationPolicy(runner(1,0)),{enabled:false,reason:'disabled-for-app'});
 assert.deepEqual(await notificationPolicy(runner(1,1)),{enabled:true,reason:'allowed'});
 assert.deepEqual(await notificationPolicy(runner(null,null)),{enabled:true,reason:'unknown'});
 console.log('Notification permission checks passed: global/app suppression, allowed/default state and read-only bounded queries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
