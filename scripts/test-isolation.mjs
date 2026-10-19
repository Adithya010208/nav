import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);mkdirSync('.sites-runtime/tests',{recursive:true});
const db=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
globalThis.__nanbaUser={userId:'alice',displayName:'Alice',email:'alice@example.test'};
const objects=new Map();
globalThis.__nanbaEnv={
 DB:{prepare(sql){return {bind(...args){const st=db.prepare(sql);return {async first(){return st.get(...args)||null},async run(){return st.run(...args)},async all(){return {results:st.all(...args)}}};}};}},
 BUCKET:{async put(k,v){objects.set(k,new Uint8Array(v))},async get(k){return objects.has(k)?{body:objects.get(k)}:null},async delete(k){objects.delete(k)}}
};
const plugin={name:'test-only-bindings',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'mock'}));b.onResolve({filter:/^@\/app\/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='env'?'export const env=globalThis.__nanbaEnv;':'export async function getChatGPTUser(){return globalThis.__nanbaUser;}'}));}};
async function compile(entry,name){const out='.sites-runtime/tests/'+name+'.cjs';await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',outfile:out,plugins:[plugin]});return require('../'+out)}
const workspace=await compile('app/api/workspace/route.ts','workspace'),files=await compile('app/api/files/route.ts','files'),file=await compile('app/api/files/[id]/route.ts','file'),ai=await compile('app/api/assistant/route.ts','ai');
const origin='https://nanba.test',put=(revision,data)=>workspace.PUT(new Request(origin+'/api/workspace',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision,data})}));
const a=await (await workspace.GET()).json();a.data.profile.name='Alice private';assert.equal((await put(0,a.data)).status,200);
const form=new FormData();form.set('file',new File(['alice private document'],'a.txt'));const uploaded=await files.POST(new Request(origin+'/api/files',{method:'POST',headers:{Origin:origin},body:form}));assert.equal(uploaded.status,201);const {id}=await uploaded.json();
globalThis.__nanbaUser={userId:'bob',displayName:'Bob',email:'bob@example.test'};const b=await (await workspace.GET()).json();assert.equal(b.revision,0);assert.equal(b.data.profile.name,'');assert.equal((await (await files.GET()).json()).files.length,0);assert.equal((await file.GET(new Request(origin+'/api/files/'+id),{params:Promise.resolve({id})})).status,404);b.data.profile.name='Bob private';assert.equal((await put(0,b.data)).status,200);
globalThis.__nanbaUser={userId:'alice',displayName:'Alice',email:'alice@example.test'};assert.equal((await (await workspace.GET()).json()).data.profile.name,'Alice private');assert.equal((await put(0,a.data)).status,409);
const aiRequest=body=>ai.POST(new Request(origin+'/api/assistant',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal((await aiRequest({question:'Teach arrays',mode:'tutor',consent:true})).status,503);
globalThis.__nanbaEnv.OPENAI_API_KEY='test-only-not-a-real-key';assert.equal((await aiRequest({question:'Teach arrays',mode:'tutor',consent:false})).status,400);assert.equal((await aiRequest({question:'Analyze',mode:'college',sourceId:'bob-source',consent:true})).status,400);
const originalFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const sent=JSON.parse(options.body);assert.equal(sent.store,false);assert.ok(!sent.input.includes('Bob private'));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({answer:'Arrays store ordered values.',suggestions:[]})}]}]});};
const output=await aiRequest({question:'Teach arrays',mode:'tutor',consent:true});assert.equal(output.status,200);assert.equal((await output.json()).answer,'Arrays store ordered values.');assert.equal((await (await workspace.GET()).json()).data.tasks.length,0,'AI must not mutate tasks');globalThis.fetch=originalFetch;
globalThis.__nanbaUser=null;assert.equal((await workspace.GET()).status,401);assert.equal((await ai.GET()).status,401);db.close();console.log('Isolation checks passed: two-user workspace/file separation, stale writes, anonymous denial, AI consent/configuration gates and mocked-provider context isolation. No live AI call made.');
