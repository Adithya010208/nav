const {execFile}=require('node:child_process');const path=require('node:path');
const globalKey='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications';
const appKey='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\com.nav.personalassistant';
function readDWORD(key,name,runner=execFile){return new Promise(resolve=>{
 runner(path.join(process.env.SystemRoot||'C:\\Windows','System32','reg.exe'),['query',key,'/v',name],{windowsHide:true,timeout:2000,maxBuffer:8192,encoding:'utf8'},(error,stdout)=>{
  if(error||typeof stdout!=='string'){resolve(null);return;}
  const match=stdout.match(new RegExp('(?:^|\\r?\\n)\\s*'+name+'\\s+REG_DWORD\\s+0x([a-f0-9]+)\\s*(?:\\r?\\n|$)','i'));resolve(match?parseInt(match[1],16):null);
 });
});}
const availabilityScript='Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public static class NavNotificationAvailability { [DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state); }\'; $navState=0; $navResult=[NavNotificationAvailability]::SHQueryUserNotificationState([ref]$navState); if($navResult -eq 0){[Console]::Write($navState)}';
function readAvailability(runner=execFile){return new Promise(resolve=>{
 runner(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-Command',availabilityScript],{windowsHide:true,timeout:4000,maxBuffer:8192,encoding:'utf8'},(error,stdout)=>{const value=typeof stdout==='string'?stdout.trim():'';resolve(!error&&/^[1-7]$/.test(value)?Number(value):null);});
});}
async function notificationPolicy(runner=execFile,availability=readAvailability){
 const global=await readDWORD(globalKey,'ToastEnabled',runner);if(global===0)return {enabled:false,reason:'disabled-for-user'};
 const app=await readDWORD(appKey,'Enabled',runner);if(app===0)return {enabled:false,reason:'disabled-for-app'};
 const state=await availability();
 const reasons={1:'not-present',2:'busy',3:'full-screen',4:'presentation',6:'quiet-time',7:'store-app'};
 if(reasons[state])return {enabled:false,reason:reasons[state],deferred:true};
 return {enabled:true,reason:state===null?'unknown':'allowed'};
}
module.exports={notificationPolicy,readAvailability};
