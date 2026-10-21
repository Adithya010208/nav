import {readFileSync,statSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [adb,serial,setupPath]=process.argv.slice(2);
const relayUrl='https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-inbox';
let setup;
try{
 if(!adb||!serial||!setupPath||!/^[\w-]+$/.test(serial)||statSync(setupPath).size>16384)throw Error();
 setup=JSON.parse(readFileSync(setupPath,'utf8'));
 if(!setup||Array.isArray(setup)||Object.keys(setup).some(k=>!['deviceToken','group','deviceId','expiresAt','relayUrl'].includes(k))||typeof setup.deviceToken!=='string'||!/^navd_[a-f0-9]{64}$/.test(setup.deviceToken)||typeof setup.group!=='string'||!setup.group.trim()||setup.group.length>150||!(Date.parse(setup.expiresAt)>Date.now())||(setup.relayUrl!=null&&setup.relayUrl!==relayUrl))throw Error();
}catch{process.stderr.write('Invalid or expired scoped phone setup. No credentials were printed.\n');process.exit(1);}
const call=(args,input)=>execFileSync(adb,['-s',serial,...args],{input,encoding:'utf8',maxBuffer:1048576,stdio:['pipe','pipe','pipe'],timeout:15000});
try{
 if(call(['get-state']).trim()!=='device'||!/versionCode=6\b/.test(call(['shell','dumpsys','package','app.nav.companion'])))throw Error();
 call(['shell','run-as','app.nav.companion','mkdir','-p','files']);
 call(['shell','run-as','app.nav.companion','sh','-c',"'umask 077; cat > files/nav-device-provision.json'"],JSON.stringify({deviceToken:setup.deviceToken,group:setup.group,relayUrl}));
 call(['shell','am','start','-n','app.nav.companion/.MainActivity']);
 let imported=false;
 for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));try{if(call(['shell','run-as','app.nav.companion','cat','shared_prefs/cloud-sync.xml']).includes('Secure setup stored.')){imported=true;break;}}catch{}}
 if(!imported)throw Error();
 let exists=true;try{call(['shell','run-as','app.nav.companion','ls','files/nav-device-provision.json']);}catch{exists=false;}
 if(exists)throw Error();unlinkSync(setupPath);
 process.stdout.write(JSON.stringify({provisioned:true,stagingFileRemoved:true,oneTimeDownloadRemoved:true,uploadsEnabled:false})+'\n');
}catch{process.stderr.write('Provisioning was not verified. Keep the scoped setup private. No credentials were printed.\n');process.exitCode=1;}
