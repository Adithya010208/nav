import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {build} from 'esbuild';
if(process.env.NAV_RUN_LIVE_VOICE_TEST!=='1')throw Error('Set NAV_RUN_LIVE_VOICE_TEST=1 to authorize the fixed synthetic sample provider call.');
await build({entryPoints:['lib/audio.ts'],outfile:'.sites-runtime/tests/voice/audio.mjs',bundle:true,platform:'node',format:'esm'});const {pcmWav,validateVoiceWav}=await import('../.sites-runtime/tests/voice/audio.mjs');
const source=await readFile('.sites-runtime/tests/voice/synthetic-speech.wav');assert.equal(source.toString('ascii',0,4),'RIFF');let pcm,fmt;
for(let i=12;i+8<=source.length;){const name=source.toString('ascii',i,i+4),n=source.readUInt32LE(i+4);if(name==='fmt ')fmt=source.subarray(i+8,i+8+n);if(name==='data')pcm=source.subarray(i+8,i+8+n);i+=8+n+(n%2);}
assert(fmt&&pcm);assert.equal(fmt.readUInt16LE(0),1);assert.equal(fmt.readUInt16LE(2),1);assert.equal(fmt.readUInt32LE(4),16000);assert.equal(fmt.readUInt16LE(14),16);
const samples=new Float32Array(pcm.length/2);for(let i=0;i<samples.length;i++)samples[i]=pcm.readInt16LE(i*2)/32768;const wav=new Uint8Array(pcmWav(samples));validateVoiceWav(wav);await writeFile('.sites-runtime/tests/voice/canonical-synthetic.wav',wav);
const origin='http://127.0.0.1:5173';const auth=await fetch(origin+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'}),cookie=auth.headers.get('set-cookie')?.split(';')[0];assert(cookie,'Local test sign-in required');
const form=new FormData();form.set('audio',new Blob([wav],{type:'audio/wav'}),'fixed-synthetic-speech.wav');form.set('language','en-IN');form.set('consent','gemini-audio');
const response=await fetch(origin+'/api/transcribe',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:form});const result=await response.json();assert.equal(response.status,200,typeof result.error==='string'?result.error:'Transcription failed');assert.match(result.transcript,/help.*revise.*math.*tomorrow/i);
console.log('Live synthetic voice test passed: '+result.transcript+' No microphone or user audio was captured.');
