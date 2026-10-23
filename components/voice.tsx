'use client';
import {useEffect,useRef,useState} from 'react';
import RecordedQuestion from './recorded-question';

type RecognitionResult={isFinal:boolean;0:{transcript:string}};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;onresult:((event:{results:ArrayLike<RecognitionResult>;resultIndex:number})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};

function BrowserDictation({onQuestion,disabled=false}:{onQuestion:(text:string)=>void;disabled?:boolean}) {
 const [available,setAvailable]=useState(false),[consent,setConsent]=useState(false),[listening,setListening]=useState(false),[status,setStatus]=useState(''),[language,setLanguage]=useState('en-IN');
 const active=useRef<Recognition|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),callback=useRef(onQuestion);
 callback.current=onQuestion;
 useEffect(()=>{
  const w=window as SpeechWindow;setAvailable(!!(w.SpeechRecognition||w.webkitSpeechRecognition));
  const stop=()=>{if(document.hidden){active.current?.abort();setListening(false)}};
  document.addEventListener('visibilitychange',stop);
  return()=>{document.removeEventListener('visibilitychange',stop);if(timer.current)clearTimeout(timer.current);const r=active.current;active.current=null;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.abort();}};
 },[]);
 useEffect(()=>{if(disabled){active.current?.abort();setListening(false)}},[disabled]);
 function start(){
  if(!consent||disabled||active.current)return;
  const w=window as SpeechWindow,Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;if(!Constructor)return;
  const recognition=new Constructor();active.current=recognition;recognition.lang=language;recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  recognition.onresult=event=>{let text='';for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)text+=event.results[i][0].transcript+' ';}if(text.trim()){callback.current(text.trim().slice(0,2000));setStatus('Draft filled. Review the text, then submit it yourself.');}};
  recognition.onerror=event=>setStatus(event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone or browser speech service was denied. Use Record question above, or change the browser permission.':event.error==='no-speech'?'No speech detected. Try again or use Record question above.':event.error==='audio-capture'?'The browser could not capture microphone audio. Check your input device.':event.error==='network'?'The browser speech service could not connect. Use Record question above.':event.error==='language-not-supported'?'This browser speech service does not support the selected language. Use Record question above.':event.error==='aborted'?'Microphone stopped.':'The browser speech service is unavailable. Use Record question above.');
  recognition.onend=()=>{if(active.current===recognition)active.current=null;if(timer.current)clearTimeout(timer.current);setListening(false)};
  try{setStatus('Listening for one question. Recording stops after 30 seconds or when you leave this page.');setListening(true);recognition.start();timer.current=setTimeout(()=>recognition.abort(),30000);}catch{active.current=null;setListening(false);setStatus('Speech recognition could not start. Type your question instead.');}
 }
 return <div className="voice-controls"><label className="check-label"><input type="checkbox" checked={consent} disabled={listening} onChange={e=>setConsent(e.target.checked)}/>Allow my browser’s speech service to process microphone audio when I press Dictate. It may send audio to its provider. NAV does not save audio.</label><div className="row"><label>Speech language<select value={language} disabled={listening} onChange={e=>setLanguage(e.target.value)}><option value="en-IN">English (India)</option><option value="ta-IN">Tamil</option><option value="hi-IN">Hindi</option></select></label>{listening?<button type="button" className="secondary" onClick={()=>{active.current?.abort();setListening(false);setStatus('Microphone stopped.')}}>Stop microphone</button>:<button type="button" className="secondary" disabled={!available||!consent||disabled} onClick={start}>Dictate question</button>}</div><small className="muted">{available?'Voice fills a draft only. No automatic requests or task changes.':'Speech recognition is unavailable in this browser. You can still type.'}</small>{status&&<p role="status">{status}</p>}</div>;
}

export function VoiceQuestion(props:{onQuestion:(text:string)=>void;disabled?:boolean}){
 return <><RecordedQuestion {...props}/><details><summary>Browser dictation (optional)</summary><BrowserDictation {...props}/></details></>;
}

export function ReadAloud({text}:{text:string}) {
 const [available,setAvailable]=useState(false),[speaking,setSpeaking]=useState(false),[status,setStatus]=useState('');
 const utterance=useRef<SpeechSynthesisUtterance|null>(null);
 useEffect(()=>{
  if(!('speechSynthesis'in window))return;
  const voices=()=>setAvailable(window.speechSynthesis.getVoices().some(v=>v.localService));voices();window.speechSynthesis.addEventListener('voiceschanged',voices);
  const stop=()=>{if(document.hidden&&utterance.current){window.speechSynthesis.cancel();utterance.current=null;setSpeaking(false)}};
  document.addEventListener('visibilitychange',stop);
  return()=>{window.speechSynthesis.removeEventListener('voiceschanged',voices);document.removeEventListener('visibilitychange',stop);if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;window.speechSynthesis.cancel();utterance.current=null;}};
 },[]);
 useEffect(()=>{if(utterance.current){window.speechSynthesis.cancel();utterance.current=null;setSpeaking(false)}},[text]);
 function read(){
  const voices=window.speechSynthesis.getVoices().filter(v=>v.localService),voice=voices.find(v=>v.lang==='en-IN')||voices.find(v=>v.lang.startsWith('en'))||voices[0];
  if(!voice){setStatus('No local voice is installed. Read the text on screen.');return;}
  window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(text.slice(0,12000));speech.voice=voice;speech.lang=voice.lang;utterance.current=speech;
  speech.onend=()=>{if(utterance.current===speech){utterance.current=null;setSpeaking(false)}};speech.onerror=()=>{if(utterance.current===speech){utterance.current=null;setSpeaking(false);setStatus('Readout stopped. The text remains available.')}};
  setSpeaking(true);setStatus(text.length>12000?'Reading the first 12,000 characters using a local device voice.':'Reading using a local device voice.');window.speechSynthesis.speak(speech);
 }
 return <div className="voice-controls"><button type="button" className="secondary" disabled={!text||!available} onClick={()=>{if(speaking){window.speechSynthesis.cancel();utterance.current=null;setSpeaking(false);setStatus('Readout stopped.')}else read();}}>{speaking?'Stop reading':'Read aloud'}</button><small className="muted"> {available?'Uses an installed local voice.':'A local device voice is required for readout.'}</small>{status&&<p role="status">{status}</p>}</div>;
}
