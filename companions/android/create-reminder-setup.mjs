import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const folder=process.argv[2];if(!folder)throw Error('A private output directory is required.');
const deviceId=randomUUID(),deviceToken='navp_'+randomBytes(32).toString('hex'),path=join(resolve(folder),'nav-phone-reminder-setup-'+deviceId+'.json');
mkdirSync(resolve(folder),{recursive:true});
writeFileSync(path,JSON.stringify({format:'nav-phone-reminder-setup',version:1,deviceId,deviceToken,expiresAt:new Date(Date.now()+30*86400000).toISOString(),relayUrl:'https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-phone-reminders'}),{flag:'wx',mode:0o600});
// Only registration metadata leaves this process; the credential remains in the private file.
console.log(JSON.stringify({deviceId,tokenHash:createHash('sha256').update(deviceToken).digest('hex'),path}));
