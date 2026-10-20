import {readFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [adb,serial,setupPath]=process.argv.slice(2);
if(!adb||!serial||!setupPath||!/^[\w-]+$/.test(serial))throw Error('Provide ADB, an authorized serial, and the one-time phone setup file.');
const setup=JSON.parse(readFileSync(setupPath,'utf8'));
if(!/^navd_[a-f0-9]{64}$/.test(setup.deviceToken)||typeof setup.group!=='string'||setup.group.length<1||setup.group.length>150||!(Date.parse(setup.expiresAt)>Date.now()))throw Error('Invalid or expired phone setup.');
const adbCall=(args,input)=>execFileSync(adb,['-s',serial,...args],{input,encoding:'utf8',maxBuffer:1024*1024,stdio:['pipe','pipe','pipe'],timeout:15000});
if(adbCall(['get-state']).trim()!=='device')throw Error('Authorize this phone first.');
process.stdout.write('Ready for private Site service credential on stdin (input is hidden).\n');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
let line='';
process.stdin.on('data',async chunk=>{
 line+=chunk.toString();if(line.includes('\u0003'))process.exit(130);if(line.length>20000)process.exit(1);
 if(!/[\r\n]/.test(line))return;process.stdin.pause();
 try{
  const {serviceToken}=JSON.parse(line.trim());line='';if(typeof serviceToken!=='string'||!/^[!-~]{20,8192}$/.test(serviceToken)||/[\r\n]/.test(serviceToken))throw Error();
  adbCall(['shell','run-as','app.nav.companion','mkdir','-p','files']);
  adbCall(['shell','run-as','app.nav.companion','sh','-c',"'umask 077; cat > files/nav-device-provision.json'"],JSON.stringify({deviceToken:setup.deviceToken,group:setup.group,serviceToken}));
  adbCall(['shell','am','start','-n','app.nav.companion/.MainActivity']);
  let imported=false;
  for(let attempt=0;attempt<10;attempt++){
   await new Promise(resolve=>setTimeout(resolve,500));
   try{const state=adbCall(['shell','run-as','app.nav.companion','cat','shared_prefs/cloud-sync.xml']);if(state.includes('Secure setup stored.')){imported=true;break;}}catch{}
  }
  if(!imported)throw Error();
  let stagingExists=true;try{adbCall(['shell','run-as','app.nav.companion','ls','files/nav-device-provision.json']);}catch{stagingExists=false;}
  if(stagingExists)throw Error();
  unlinkSync(setupPath);
  process.stdout.write(JSON.stringify({provisioned:true,stagingFileRemoved:true,oneTimeDownloadRemoved:true,uploadsEnabled:false})+'\n');
  if(process.stdin.isTTY)process.stdin.setRawMode(false);process.exit(0);
 }catch{
  process.stdout.write('Provisioning was not verified. Keep the phone unlocked with the matching group saved, and retry. No credentials were printed.\n');
  if(process.stdin.isTTY)process.stdin.setRawMode(false);process.exit(1);
 }
});
