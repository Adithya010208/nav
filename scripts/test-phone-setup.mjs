import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=mkdtempSync(join(tmpdir(),'nav-scoped-fixture-'));
const token='navd_'+'d'.repeat(64),fixture={deviceToken:token,group:'Synthetic college',expiresAt:new Date(Date.now()+86400000).toISOString()};
try{
 const cases=[{serviceToken:'forbidden-synthetic'},{relayUrl:'https://other.invalid'},{expiresAt:'2000-01-01'},{projectSecret:'forbidden-synthetic'},{deviceToken:'bad'},{group:' '},null,[], '{"deviceToken":"'+token+'",', 'x'.repeat(16385)];
 for(const [i,change] of cases.entries()){
  const file=join(directory,i+'.json');const value=typeof change==='string'?change:JSON.stringify(change===null||Array.isArray(change)?change:{...fixture,...change});writeFileSync(file,value);
  const r=spawnSync(process.execPath,['companions/android/provision-device.mjs',join(directory,'absent-adb'),'fixture',file],{encoding:'utf8'});const out=r.stdout+r.stderr;
  assert.notEqual(r.status,0);assert.match(out,/Invalid or expired scoped phone setup/);assert.equal(out.includes(token),false);assert.equal(out.includes('forbidden-synthetic'),false);assert.equal(existsSync(file),true);
 }
 const file=join(directory,'valid.json');writeFileSync(file,JSON.stringify(fixture));const r=spawnSync(process.execPath,['companions/android/provision-device.mjs',join(directory,'absent-adb'),'fixture',file],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/Provisioning was not verified/);assert.equal((r.stdout+r.stderr).includes(token),false);assert.equal(existsSync(file),true);
 console.log('Scoped setup checks passed: invalid, broad, malformed and oversized inputs rejected without token disclosure; failed provisioning preserves file. No device accessed.');
}finally{rmSync(directory,{recursive:true,force:true});}
