import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
let manifest;
const live=process.argv[2]==='--live';
let text;
if(live){
  const response=await fetch('https://dudidd-wq.github.io/chavruta-app/data/book-covers.js?audit='+Date.now(),{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Live manifest HTTP '+response.status);
  text=await response.text();
}else text=await fs.readFile(process.argv[2] || 'out/app/data/book-covers.js','utf8');
vm.runInNewContext(text, {window:{__D:(name,value)=>{if(name==='book-covers')manifest=value;}}}, {timeout:3000});
if(manifest?.schema!==1||manifest.page!==1)throw Error('Invalid cover manifest');
const entries=Object.entries(manifest.covers),failures=[];let next=0,bytes=0;
await Promise.all(Array.from({length:6},async()=>{while(next<entries.length){
  const [id,asset]=entries[next++],match=new RegExp('^data/book-covers/'+id+'-([a-f0-9]{16})\\.webp$').exec(asset);
  if(!/^(?:[0-9]{1,8}|c-[a-f0-9]{24})$/.test(id)||!match)throw Error('Invalid cover asset');
  try{
    const response=await fetch(new URL(asset,'https://dudidd-wq.github.io/chavruta-app/'),{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const content=Buffer.from(await response.arrayBuffer());
    if(!(response.headers.get('content-type')||'').includes('image/webp')||content.toString('ascii',0,4)!=='RIFF'||content.toString('ascii',8,12)!=='WEBP')throw Error('Not a WebP image');
    if(crypto.createHash('sha256').update(content).digest('hex').slice(0,16)!==match[1])throw Error('Image differs from manifest');
    bytes+=content.length;
  }catch(error){failures.push({id,error:error.message});}
}}));
console.log(JSON.stringify({checked:entries.length,passed:entries.length-failures.length,bytes,failures},null,2));
if(failures.length)process.exitCode=1;
