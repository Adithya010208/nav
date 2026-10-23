'use client';
import {useEffect,useRef,useState} from 'react';
import {Upload,FileText,BookOpen,ScanText} from 'lucide-react';
import type {OCRLanguage} from '@/lib/pdf-extraction';
type StoredFile={id:string;name:string;size:number};
export default function Documents({onImport}:{onImport:(text:string)=>void}){
 const [files,setFiles]=useState<StoredFile[]>([]),[text,setText]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [language,setLanguage]=useState<OCRLanguage>('eng'),[first,setFirst]=useState(1),[last,setLast]=useState(1);
 const active=useRef<AbortController|null>(null);
 async function refresh(){try{const r=await fetch('/api/files'),j=await r.json() as {error:string;files:StoredFile[]};if(!r.ok)throw Error(j.error);setFiles(j.files);}catch(e){setStatus(e instanceof Error?e.message:'Could not load files.');}}
 useEffect(()=>{void refresh();return()=>active.current?.abort();},[]);
 async function upload(file:File){
  if(file.size>8000000)return setStatus('Choose a file smaller than 8 MB.');setBusy(true);
  try{const form=new FormData();form.set('file',file);const r=await fetch('/api/files',{method:'POST',body:form}),j=await r.json() as {error:string};if(!r.ok)throw Error(j.error);await refresh();setStatus('Stored privately in your account. Read text, or use Recognize scan for an image PDF.');}
  catch(e){setStatus(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}
 }
 async function remove(file:StoredFile){
  if(!window.confirm('Permanently delete '+file.name+' from your account? This cannot be undone. Imported excerpts and tasks remain in your workspace.'))return;
  setBusy(true);try{const r=await fetch('/api/files/'+file.id,{method:'DELETE',headers:{'X-NAV-Confirm':'delete-document'}}),j=await r.json() as {error:string};if(!r.ok)throw Error(j.error);setText('');await refresh();setStatus('Document deleted. Imported excerpts remain until you remove them separately.');}
  catch(e){setStatus(e instanceof Error?e.message:'Deletion failed.');}finally{setBusy(false);}
 }
 async function read(file:StoredFile,scan=false){
  const controller=new AbortController();active.current=controller;setBusy(true);setStatus(scan?'Preparing local scan recognition…':'Reading document…');
  try{
   const r=await fetch('/api/files/'+file.id,{signal:controller.signal});if(!r.ok)throw Error('Document could not be loaded.');
   if(file.name.toLowerCase().endsWith('.pdf')){
    const {extractPDF}=await import('@/lib/pdf-extraction');const result=await extractPDF(new Uint8Array(await r.arrayBuffer()),{signal:controller.signal,onProgress:setStatus,...(scan?{ocr:{language,first,last}}:{})});
    setText(result.text);setStatus((scan?'Scan recognized locally. OCR can misread names, numbers and dates; verify against the original before importing.':'Text extracted locally. Review it before importing.')+(result.truncated?' Showing the first 30,000 characters.':'')+(result.confidence!==undefined&&result.confidence<75?' Recognition quality is low; consider a clearer scan or another language.':''));
   }else{const output=await r.text();if(!output.trim())throw Error('This document contains no readable text.');setText(output.slice(0,30000));setStatus('Text loaded. Review it before importing.'+(output.length>30000?' Showing the first 30,000 characters.':''));}
  }catch(e){setStatus(controller.signal.aborted?'Reading cancelled. Your stored file and previous excerpt are unchanged.':e instanceof Error?e.message:'Could not read document.');}
  finally{if(active.current===controller)active.current=null;setBusy(false);}
 }
 return <section className="panel pad">
  <div className="spread"><h2>Your documents</h2><button className="secondary" disabled={busy} onClick={refresh}>Refresh files</button></div>
  <p>PDFs and text documents stay private to your account. Text extraction and scan recognition run on this device. Scan pages are not sent to an OCR provider.</p>
  <label className="upload"><Upload size={17}/>Upload PDF / text (max 8 MB)<input type="file" accept=".pdf,.txt,.md,.csv" disabled={busy} onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value='';}}/></label>
  <fieldset disabled={busy}><legend>Scanned PDF options</legend><p>Recognize up to 10 pages at a time. First use downloads NAV’s local OCR engine and language data. Choose the language printed on the scan.</p>
   <div className="row"><label>Scan language<select value={language} onChange={e=>setLanguage(e.target.value as OCRLanguage)}><option value="eng">English</option><option value="tam">Tamil</option><option value="hin">Hindi</option></select></label><label>First page<input type="number" min={1} max={80} value={first} onChange={e=>setFirst(Number(e.target.value))}/></label><label>Last page<input type="number" min={1} max={80} value={last} onChange={e=>setLast(Number(e.target.value))}/></label></div>
  </fieldset>
  {files.map(f=><div className="file" key={f.id}><FileText size={16}/><a href={'/api/files/'+f.id} target="_blank" rel="noreferrer">{f.name}</a><small>{Math.ceil(f.size/1024)} KB</small><button className="secondary" disabled={busy} onClick={()=>read(f)}><BookOpen size={13}/>Read text</button>{f.name.toLowerCase().endsWith('.pdf')&&<button className="secondary" disabled={busy} onClick={()=>read(f,true)}><ScanText size={13}/>Recognize scan</button>}<button className="secondary" disabled={busy} onClick={()=>remove(f)}>Delete document</button></div>)}
  {active.current&&<button className="secondary" onClick={()=>active.current?.abort()}>Cancel reading</button>}
  {status&&<p role="status">{status}</p>}
  {text&&<><label>Extracted text / selected excerpt<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={30000} style={{minHeight:220}}/></label><button className="primary" disabled={busy} onClick={()=>{onImport(text);setStatus('Copied to the message form above. Verify its received date and import it.');}}>Use in college inbox ↑</button></>}
 </section>;
}
