// Render only the original first PDF page. Never synthesize or borrow covers.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import { fileURLToPath } from 'node:url';
import canvas from '@napi-rs/canvas';
import {cataloguePDFURL,openCataloguePDF} from './pdf-source.mjs';
const {createCanvas,DOMMatrix,ImageData,Path2D}=canvas;
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const lib=await import('pdfjs-dist/legacy/build/pdf.mjs');
lib.GlobalWorkerOptions.workerSrc=fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'));
const pdfRoot=path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
const wasmUrl=path.join(pdfRoot,'wasm')+path.sep;
const standardFontDataUrl=path.join(pdfRoot,'standard_fonts')+path.sep;
const cMapUrl=path.join(pdfRoot,'cmaps')+path.sep;
class CanvasFactory {
  create(w,h){const canvas=createCanvas(w,h);return {canvas,context:canvas.getContext('2d')};}
  reset(item,w,h){item.canvas.width=w;item.canvas.height=h;}
  destroy(item){item.canvas.width=0;item.canvas.height=0;item.canvas=null;item.context=null;}
}
const data=path.resolve(process.argv[2]||'data'),out=path.join(data,'book-covers');
const parse=async name=>{let value;vm.runInNewContext(await fs.readFile(path.join(data,name+'.js'),'utf8'),{window:{__D:(key,obj)=>{if(key===name)value=obj;}}},{timeout:3000});return value;};
const [T,C]=await Promise.all([parse('tree'),parse('book-catalog')]);
if(C?.schema!==1||C.nbooks!==T.books.length||C.nunits!==T.nunits)throw Error('Catalogue mismatch');
const sources=new Map(), sourceIDs=C.coverSources||{};
for(const id of C.bookScans.flat())sources.set(id,{kind:'hb'});
for(const [identity,id]of Object.entries(sourceIDs))if(identity.startsWith('pdf:')){
  const url=cataloguePDFURL(identity.slice(4));
  if(!/^c-[a-f0-9]{24}$/.test(id)||id!=='c-'+crypto.createHash('sha256').update(identity).digest('hex').slice(0,24))throw Error('Invalid document cover identity');
  sources.set(id,{kind:'pdf',url});
}
for(const series of T.series)for(const volume of series.vols){const match=volume[3]?.confirmed===false?null:/^hb:([0-9]{1,8})$/.exec(volume[2]);if(match)sources.set(match[1],{kind:'hb'});}
const ids=new Set(sources.keys());
if([...ids].some(id=>!/^(?:[0-9]{1,8}|c-[a-f0-9]{24})$/.test(id)))throw Error('Invalid scan ID');
const scansForBook=i=>[...new Set([...(C.bookScans[i]||[]),...(C.bookSourceKeys?.[i]||[]).map(key=>sourceIDs[key]).filter(Boolean)])];
const scansForSeries=s=>s.vols.filter(v=>v[3]?.confirmed!==false).map(v=>sourceIDs[v[3]?.source_key]||/^hb:([0-9]{1,8})$/.exec(v[2])?.[1]).filter(Boolean);
await fs.mkdir(out,{recursive:true});
let previous={};try{previous=(await parse('book-covers')).covers||{};}catch{}
const covers={},failures=[];
for(const [id,asset]of Object.entries(previous))if(ids.has(id)&&new RegExp('^data/book-covers/'+id+'-[a-f0-9]{16}\\.webp$').test(asset)){
  try{const bytes=await fs.readFile(path.join(data,'book-covers',path.basename(asset)));const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);if(asset.endsWith('-'+hash+'.webp'))covers[id]=asset;}catch{}
}
// Prepare the first visible author groups before later catalogue entries.
const priority=new Map();
const ordered=T.books.map((b,i)=>({r:b[0],name:b[1],scans:scansForBook(i)}));
for(const s of T.series)ordered.push({r:s.r,name:s.n,scans:scansForSeries(s)});
for(const entry of ordered.sort((a,b)=>a.r-b.r||a.name.localeCompare(b.name,'he')))for(const id of entry.scans)if(!priority.has(id))priority.set(id,priority.size);
// Give every work a prepared shelf image before generating all its other copies.
const featured=new Set(),featuredPriority=new Map();
for(const s of T.series){
  const scans=scansForSeries(s);
  if(scans.length&&!scans.some(id=>covers[id])){featured.add(scans[0]);featuredPriority.set(scans[0],s.r===8?2:1);}
}
const maxArg=process.argv.find(x=>x.startsWith('--max-new='));
const maxNew=maxArg?Number(maxArg.split('=')[1]):Infinity;
if(maxArg&&(!Number.isSafeInteger(maxNew)||maxNew<1||maxNew>2000))throw Error('Invalid cover batch limit');
const onlyArg=process.argv.find(x=>x.startsWith('--only-id='));
const onlyID=onlyArg?.slice('--only-id='.length);
if(onlyID&&!ids.has(onlyID))throw Error('Unknown cover source');
const missing=[...ids].filter(id=>!covers[id]&&(!onlyID||id===onlyID)).sort((a,b)=>(featuredPriority.get(b)||0)-(featuredPriority.get(a)||0)||(priority.get(a)??100000)-(priority.get(b)??100000)).slice(0,maxNew);
const publish=process.argv.includes('--publish-checkpoints');
async function flush(){
  const snapshot=Object.fromEntries(Object.entries(covers).sort((a,b)=>a[0].localeCompare(b[0],'en',{numeric:true})));
  await fs.writeFile(path.join(data,'book-covers.js'),'window.__D("book-covers",'+JSON.stringify({schema:1,page:1,covers:snapshot})+');\n');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({renderer:lib.version,total:ids.size,prepared:Object.keys(snapshot).length,failures:[...failures]},null,2)+'\n');
  if(!publish)return;
  const index=await fs.readFile('index.html','utf8'),version=crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0,16);
  const tag='<meta name="chavruta-book-covers-version" content="'+version+'">';
  await fs.writeFile('index.html',index.includes('name="chavruta-book-covers-version"')?index.replace(/<meta name="chavruta-book-covers-version"[^>]*>/,tag):index.replace('</head>',tag+'\n</head>'));
  execFileSync('git',['add','index.html','data/book-covers.js','data/book-covers/report.json',...Object.values(snapshot)]);
  try{execFileSync('git',['diff','--cached','--quiet']);return;}catch(error){if(error.status!==1)throw error;}
  execFileSync('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Prepare '+Object.keys(snapshot).length+' validated book thumbnails'],{stdio:'inherit'});
  execFileSync('git',['pull','--rebase','origin','main'],{stdio:'inherit'});
  execFileSync('git',['push','origin','HEAD:main'],{stdio:'inherit'});
  if(process.env.GH_TOKEN&&process.env.GITHUB_REPOSITORY){
    const response=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/pages/builds',{method:'POST',headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
    if(!response.ok)console.log('Pages build request returned '+response.status);
  }
}
let checkpoint=Promise.resolve();
const imageOps=new Set([lib.OPS.paintImageXObject,lib.OPS.paintImageXObjectRepeat,lib.OPS.paintInlineImageXObject,lib.OPS.paintInlineImageXObjectGroup,lib.OPS.paintImageMaskXObject,lib.OPS.paintImageMaskXObjectRepeat]);
async function render(id){
  let loading,source;
  try{
    let options;
    if(sources.get(id).kind==='pdf'){source=await openCataloguePDF(sources.get(id).url,lib);options=source.options;}
    else{
    const response=await fetch('https://beta.hebrewbooks.org/pagefeed/hebrewbooks_org_'+id+'_1.pdf',{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'application/pdf','User-Agent':'Chavruta first-page thumbnail builder'}});
    if(response.status===429){const seconds=Number(response.headers.get('retry-after'));await new Promise(r=>setTimeout(r,Math.min(60000,Math.max(1000,(seconds||10)*1000))));throw Error('upstream rate limited');}
    if(!response.ok||!(response.headers.get('content-type')||'').includes('application/pdf'))throw Error('source unavailable: '+response.status);
    if(Number(response.headers.get('content-length'))>6*1024*1024)throw Error('PDF too large');
    const chunks=[];let length=0;
    for await(const chunk of response.body){length+=chunk.length;if(length>6*1024*1024)throw Error('PDF too large');chunks.push(chunk);}
    const bytes=Buffer.concat(chunks);
    if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('invalid PDF');
    options={data:new Uint8Array(bytes)};
    }
    const wait=promise=>source?Promise.race([promise,source.error]):promise;
    loading=lib.getDocument({...options,CanvasFactory,wasmUrl,standardFontDataUrl,cMapUrl,cMapPacked:true,useSystemFonts:true,disableFontFace:true,isEvalSupported:false,stopAtErrors:true});
    const pdf=await wait(loading.promise),page=await wait(pdf.getPage(1)),natural=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(240/natural.width,340/natural.height)});
    const image=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await wait(page.render({canvas:image,canvasContext:image.getContext('2d'),viewport}).promise);
    const list=await wait(page.getOperatorList());
    for(let i=0;i<list.fnArray.length;i++)if(imageOps.has(list.fnArray[i])){
      const ref=list.argsArray[i]?.[0];
      const obj=typeof ref==='string'?await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('image decode timeout')),3000);(ref.startsWith('g_')?page.commonObjs:page.objs).get(ref,value=>{clearTimeout(timer);resolve(value);});}):ref;
      if(!obj||!(obj.width>0)||!(obj.height>0)||(!obj.bitmap&&!obj.data?.length))throw Error('incomplete PDF scan');
    }
    const webp=image.toBuffer('image/webp',78),hash=crypto.createHash('sha256').update(webp).digest('hex').slice(0,16),filename=id+'-'+hash+'.webp';
    await fs.writeFile(path.join(out,filename),webp);covers[id]='data/book-covers/'+filename;
  }catch(error){failures.push({id,error:String(error.message).slice(0,150)});}
  finally{source?.close();await loading?.destroy().catch(()=>{});}
}
let next=0,completed=0;
await Promise.all(Array.from({length:2},async()=>{while(next<missing.length){const id=missing[next++];await render(id);completed++;if(completed%20===0){console.log(JSON.stringify({completed,total:missing.length,prepared:Object.keys(covers).length,failed:failures.length}));checkpoint=checkpoint.then(flush);await checkpoint;}await new Promise(r=>setTimeout(r,4000));}}));
if(!Object.keys(covers).length)throw Error('No validated covers');
await checkpoint;await flush();
console.log(JSON.stringify({total:ids.size,prepared:Object.keys(covers).length,failed:failures.length}));
