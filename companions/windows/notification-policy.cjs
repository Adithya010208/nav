const {execFile}=require('node:child_process');const path=require('node:path');
const globalKey='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications';
const appKey='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\com.nav.personalassistant';
function readDWORD(key,name,runner=execFile){return new Promise(resolve=>{
 runner(path.join(process.env.SystemRoot||'C:\\Windows','System32','reg.exe'),['query',key,'/v',name],{windowsHide:true,timeout:2000,maxBuffer:8192,encoding:'utf8'},(error,stdout)=>{
  if(error||typeof stdout!=='string'){resolve(null);return;}
  const match=stdout.match(new RegExp('(?:^|\\r?\\n)\\s*'+name+'\\s+REG_DWORD\\s+0x([a-f0-9]+)\\s*(?:\\r?\\n|$)','i'));resolve(match?parseInt(match[1],16):null);
 });
});}
async function notificationPolicy(runner=execFile){
 const global=await readDWORD(globalKey,'ToastEnabled',runner);if(global===0)return {enabled:false,reason:'disabled-for-user'};
 const app=await readDWORD(appKey,'Enabled',runner);if(app===0)return {enabled:false,reason:'disabled-for-app'};
 return {enabled:true,reason:global===null&&app===null?'unknown':'allowed'};
}
module.exports={notificationPolicy};
