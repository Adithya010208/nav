import type {Worker} from 'tesseract.js';

export type OCRLanguage='eng'|'tam'|'hin';
export type ExtractionOptions={signal:AbortSignal;onProgress:(message:string)=>void;ocr?:{language:OCRLanguage;first:number;last:number}};
export function pageRange(total:number,first:number,last:number){
 if(!Number.isInteger(total)||total<1||total>80)throw Error('Choose a PDF with at most 80 pages.');
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>total||last-first>=10)throw Error('Choose up to 10 existing pages for each scan, starting at page 1 or later.');
 return Array.from({length:last-first+1},(_,i)=>first+i);
}
export function ocrDimensions(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid PDF page dimensions.');
 const scale=Math.min(2,1800/Math.max(width,height));
 return {scale,width:Math.max(1,Math.ceil(width*scale)),height:Math.max(1,Math.ceil(height*scale))};
}
export async function extractPDF(data:Uint8Array,options:ExtractionOptions){
 const {signal,onProgress,ocr}=options;signal.throwIfAborted();
 if(ocr&&!['eng','tam','hin'].includes(ocr.language))throw Error('Choose English, Tamil or Hindi.');
 const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 const loading=pdf.getDocument({data});let worker:Worker|undefined,render:{cancel:()=>void}|undefined,disposed=false;
 let rejectAbort:(reason:unknown)=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{rejectAbort=reject;});
 const abort=()=>{rejectAbort(signal.reason||new DOMException('Cancelled','AbortError'));render?.cancel();void loading.destroy();void worker?.terminate();};
 signal.addEventListener('abort',abort,{once:true});
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  if(signal.aborted)abort();
  const doc=await Promise.race([loading.promise,cancelled]);signal.throwIfAborted();
  const pages=ocr?pageRange(doc.numPages,ocr.first,ocr.last):pageRange(doc.numPages,1,Math.min(doc.numPages,10));
  if(!ocr){pages.splice(0,pages.length,...Array.from({length:doc.numPages},(_,i)=>i+1));}
  if(ocr){
   onProgress('Preparing local OCR. The first run downloads language data from NAV; document pages stay on this device.');
   const {createWorker}=await import('tesseract.js');
   const origin=window.location.origin;
   // Every engine/model request is same-origin; no CDN or OCR provider receives pages.
   const pending=createWorker(ocr.language,1,{workerPath:origin+'/ocr/worker.min.js',corePath:origin+'/ocr/core',langPath:origin+'/ocr/lang',workerBlobURL:false,logger:()=>{},errorHandler:()=>{}});
   const fail=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('OCR preparation timed out. Cancel and retry when the connection is stable.')),120000);});
   void pending.then(w=>{if(disposed||signal.aborted)void w.terminate();},()=>{});
   worker=await Promise.race([pending,fail,cancelled]);clearTimeout(timeout);signal.throwIfAborted();
  }
  let output='',readable=0;const confidences:number[]=[];
  for(const number of pages){
   signal.throwIfAborted();onProgress((ocr?'Recognizing scanned':'Reading')+' page '+number+' of '+doc.numPages+'…');
   const page=await doc.getPage(number);let text='';
   try{
    if(worker){
     const base=page.getViewport({scale:1}),size=ocrDimensions(base.width,base.height),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
     try{
      const context=canvas.getContext('2d');if(!context)throw Error('Canvas is unavailable on this device.');
      const task=page.render({canvas,canvasContext:context,viewport:page.getViewport({scale:size.scale}),background:'white'});render=task;await task.promise;render=undefined;signal.throwIfAborted();
      const recognition=worker.recognize(canvas);
      const limit=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('This page took too long to recognize. Try one page at a time.')),120000);});
      const result=await Promise.race([recognition,limit,cancelled]);clearTimeout(timeout);signal.throwIfAborted();text=result.data.text;confidences.push(result.data.confidence);
     }finally{canvas.width=1;canvas.height=1;}
    }else{
     const content=await page.getTextContent();text=content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('');
    }
   }finally{page.cleanup();}
   if(text.trim()){readable++;output+='[Page '+number+']\n'+text.trim()+'\n\n';}
   if(output.length>=30000)break;
  }
  if(!readable)throw Error(ocr?'No text could be recognized. Check the scan quality and language.':'No embedded text found. Use Recognize scan to read this scanned PDF.');
  return {text:output.slice(0,30000),truncated:output.length>30000,confidence:confidences.length?Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length):undefined};
 }finally{disposed=true;if(timeout)clearTimeout(timeout);signal.removeEventListener('abort',abort);await worker?.terminate();await loading.destroy();}
}
