import {pcmWav,MAX_VOICE_SECONDS} from './audio';
export async function recordingToWav(clip:Blob){
 const context=new AudioContext();
 try{
  const decoded=await context.decodeAudioData(await clip.arrayBuffer());
  const frames=Math.min(16000*MAX_VOICE_SECONDS,Math.floor(decoded.duration*16000));if(frames<1600)throw Error('The recording is too short. Speak a question and stop recording.');
  const offline=new OfflineAudioContext(1,frames,16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
  const rendered=await offline.startRendering();return new Blob([pcmWav(rendered.getChannelData(0))],{type:'audio/wav'});
 }finally{await context.close();}
}
