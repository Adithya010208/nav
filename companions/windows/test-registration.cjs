const assert=require('node:assert/strict');const {APP_ID,CLSID,registerShortcut}=require('./registration.cjs');
let exists=true,owner=APP_ID,calls=[];const fs={existsSync:()=>exists,mkdirSync:()=>{}},shell={readShortcutLink:()=>({appUserModelId:owner}),writeShortcutLink:(file,operation,options)=>{calls.push({file,operation,options});return true;}};
assert(registerShortcut(shell,fs,'fixture-profile','fixture-NAV.exe'));assert.equal(calls[0].operation,'update');assert.equal(calls[0].options.toastActivatorClsid,CLSID);assert.equal(calls[0].options.appUserModelId,APP_ID);assert.equal(calls[0].options.target,'fixture-NAV.exe');
owner='another-app';assert.equal(registerShortcut(shell,fs,'fixture-profile','fixture-NAV.exe'),false);assert.equal(calls.length,1);
exists=false;assert(registerShortcut(shell,fs,'fixture-profile','fixture-NAV.exe'));assert.equal(calls[1].operation,'create');
console.log('Windows registration checks passed: stable notification identity, upgrade target and foreign-shortcut preservation.');
