import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
const tests=readdirSync('scripts').filter(f=>/^test-.*\.mjs$/.test(f)&&!['test-api.mjs','test-voice-live.mjs'].includes(f)).map(f=>'scripts/'+f);
tests.push(...readdirSync('companions/windows').filter(f=>/^test(?:-.*)?\.cjs$/.test(f)).map(f=>'companions/windows/'+f));
mkdirSync('.sites-runtime/audit',{recursive:true});
const results=[];
for(const file of tests){const start=Date.now(),r=spawnSync(process.execPath,[file],{encoding:'utf8',timeout:180000,maxBuffer:1000000});const output=(r.stdout||'')+(r.stderr||'');const result={file,status:r.status===0?'PASS':'FAIL',exitCode:r.status,elapsedMs:Date.now()-start,output};results.push(result);console.log(result.status+' '+file);writeFileSync('.sites-runtime/audit/tests.json',JSON.stringify({executedAt:new Date().toISOString(),externalProviders:'mocked except local OCR engine; no live API request',results},null,2));}
process.exitCode=results.some(r=>r.status!=='PASS')?1:0;
