export const MAX_VOICE_SECONDS=30;
export function pcmWav(samples:Float32Array){
 if(samples.length<1600||samples.length>16000*MAX_VOICE_SECONDS)throw Error('Record between 0.1 and 30 seconds.');
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const n=Math.max(-1,Math.min(1,Number.isFinite(samples[i])?samples[i]:0));view.setInt16(44+i*2,n<0?Math.round(n*32768):Math.round(n*32767),true);}
 return buffer;
}
export function validateVoiceWav(bytes:Uint8Array){
 if(bytes.length<3244||bytes.length>960044)throw Error('Record a voice clip of up to 30 seconds.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(at:number,n:number)=>String.fromCharCode(...bytes.slice(at,at+n));
 if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||tag(36,4)!=='data'||view.getUint32(4,true)!==bytes.length-8||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint32(28,true)!==32000||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw Error('Unsupported recording. Record again using NAV’s microphone control.');
 let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(view.getInt16(i,true)));
 if(peak<8)throw Error('The recording is silent. Check the microphone and try again.');
 return (bytes.length-44)/32000;
}
