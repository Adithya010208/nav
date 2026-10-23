import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),manifest={engine:'tesseract.js 7.0.0',languages:['eng','tam','hin'],files:{}};
async function copy(source,target){const from=new URL(source,root),to=new URL('public/ocr/'+target,root);await mkdir(new URL('.',to),{recursive:true});await copyFile(from,to);manifest.files[target]=createHash('sha256').update(await readFile(from)).digest('hex');}
await copy('node_modules/tesseract.js/dist/worker.min.js','worker.min.js');
for(const variant of ['lstm','simd-lstm','relaxedsimd-lstm'])await copy('node_modules/tesseract.js-core/tesseract-core-'+variant+'.wasm.js','core/tesseract-core-'+variant+'.wasm.js');
for(const language of manifest.languages)await copy('node_modules/@tesseract.js-data/'+language+'/4.0.0_best_int/'+language+'.traineddata.gz','lang/'+language+'.traineddata.gz');
await copy('node_modules/tesseract.js/LICENSE.md','TESSERACT-LICENSE.txt');
await copy('node_modules/tesseract.js-core/LICENSE','CORE-LICENSE.txt');
await writeFile(new URL('public/ocr/manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared same-origin OCR worker, three LSTM cores and English/Tamil/Hindi models. No document data is transmitted.');
