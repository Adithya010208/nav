import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {createWorker} from 'tesseract.js';
import {build} from 'esbuild';
const dir='.sites-runtime/tests/ocr';await mkdir(dir,{recursive:true});
await build({entryPoints:['lib/pdf-extraction.ts'],outfile:dir+'/extraction.mjs',bundle:true,platform:'node',format:'esm',external:['pdfjs-dist','tesseract.js']});
const {pageRange,ocrDimensions}=await import('../'+dir+'/extraction.mjs');
assert.deepEqual(pageRange(80,71,80),[71,72,73,74,75,76,77,78,79,80]);
for(const args of [[81,1,1],[1,0,1],[4,1,5],[30,1,11],[4,3,2],[4,1.5,2]])assert.throws(()=>pageRange(...args));
const size=ocrDimensions(100000,50000);assert(size.width<=1800&&size.height<=1800);assert.throws(()=>ocrDimensions(Infinity,1));assert.throws(()=>ocrDimensions(0,1));
const manifest=JSON.parse(await readFile('public/ocr/manifest.json'));
for(const [file,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile('public/ocr/'+file)).digest('hex'),hash);
const canvas=createCanvas(1400,440),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1400,440);ctx.fillStyle='black';ctx.font='bold 48px Arial';ctx.fillText('NAV SCANNED DOCUMENT CHECK',60,100);ctx.font='40px Arial';ctx.fillText('Maths exam on 24 October 2026',60,210);ctx.fillText('Submit assignment by 25 October 2026',60,310);
const png=canvas.toBuffer('image/png');await writeFile(dir+'/nav-scan-fixture.png',png);
const rgba=ctx.getImageData(0,0,1400,440).data,rgb=Buffer.alloc(1400*440*3);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}
const image=deflateSync(rgb),drawing=Buffer.from('q 700 0 0 220 0 0 cm /Image1 Do Q');
const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 220] /Resources << /XObject << /Image1 5 0 R >> >> /Contents 4 0 R >>'),Buffer.concat([Buffer.from('<< /Length '+drawing.length+' >>\nstream\n'),drawing,Buffer.from('\nendstream')]),Buffer.concat([Buffer.from('<< /Type /XObject /Subtype /Image /Width 1400 /Height 440 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length '+image.length+' >>\nstream\n'),image,Buffer.from('\nendstream')])];
let pdf=Buffer.from('%PDF-1.4\n'),offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf=Buffer.concat([pdf,Buffer.from((i+1)+' 0 obj\n'),objects[i],Buffer.from('\nendobj\n')]);}const xref=pdf.length;pdf=Buffer.concat([pdf,Buffer.from('xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n')]);await writeFile(dir+'/nav-scan-fixture.pdf',pdf);
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const loading=pdfjs.getDocument({data:new Uint8Array(pdf),useSystemFonts:true}),doc=await loading.promise;
assert.equal(doc.numPages,1);const page=await doc.getPage(1);assert.equal((await page.getTextContent()).items.length,0,'Fixture must actually be an image-only PDF');
const rendered=createCanvas(1400,440);await page.render({canvas:rendered,canvasContext:rendered.getContext('2d'),viewport:page.getViewport({scale:2})}).promise;
for(const language of ['eng','tam','hin']){
 const worker=await createWorker(language,1,{langPath:resolve('public/ocr/lang'),cacheMethod:'none'});
 try{if(language==='eng'){const result=await worker.recognize(rendered.toBuffer('image/png'));assert.match(result.data.text,/Maths exam on 24 October 2026/i);assert.match(result.data.text,/Submit assignment by 25 October 2026/i);assert(result.data.confidence>75);}}
 finally{await worker.terminate();}
}
await loading.destroy();console.log('OCR checks passed: image-only PDF rendered and recognized with exact dates; all three local models load; asset hashes, range and memory bounds verified. Fixture: '+resolve(dir+'/nav-scan-fixture.pdf'));
