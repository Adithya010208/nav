import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [adb,serial,path]=process.argv.slice(2);let setup;
try{
 if(!adb||!serial||!path||!/^[\w-]+$/.test(serial)||statSync(path).size>6000)throw Error();setup=JSON.parse(readFileSync(path,'utf8'));
 if(!setup||Object.keys(setup).some(k=>!['format','version','deviceId','deviceToken','expiresAt','relayUrl'].includes(k))||setup.format!=='nav-phone-reminder-setup'||setup.version!==1||!/^[a-f0-9-]{36}$/.test(setup.deviceId)||!/^navp_[a-f0-9]{64}$/.test(setup.deviceToken)||setup.relayUrl!=='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-phone-reminders'||!(Date.parse(setup.expiresAt)>Date.now()))throw Error();
}catch{console.error('Invalid or expired reminder-only phone setup. No credential was printed.');process.exit(1);}
const call=(args,input)=>execFileSync(adb,['-s',serial,...args],{input,encoding:'utf8',maxBuffer:1048576,stdio:['pipe','pipe','pipe'],timeout:15000});
try{
 if(call(['get-state']).trim()!=='device'||!/versionCode=8\b/.test(call(['shell','dumpsys','package','app.nav.companion'])))throw Error();
 call(['shell','run-as','app.nav.companion','mkdir','-p','files']);
 call(['shell','run-as','app.nav.companion','sh','-c',"'umask 077; cat > files/nav-task-reminder-setup.json'"],JSON.stringify(setup));
 call(['shell','am','start','-n','app.nav.companion/.MainActivity']);
 let imported=false;
 for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));try{if(call(['shell','run-as','app.nav.companion','cat','shared_prefs/task-reminders.xml']).includes('Separate reminder setup stored encrypted.')){imported=true;break;}}catch{}}
 if(!imported)throw Error();let exists=true;try{call(['shell','run-as','app.nav.companion','ls','files/nav-task-reminder-setup.json']);}catch{exists=false;}if(exists)throw Error();
 console.log(JSON.stringify({provisioned:true,privateStagingRemoved:true,remindersEnabled:false,downloadRetained:true}));
}catch{console.error('Phone reminder provisioning was not verified. No credential was printed. Keep the setup file private.');process.exitCode=1;}
