// Verify the deployed book shelf, local snapshot, and exact source images in Chrome.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'));
(async()=>{
 const origin='https://dudidd-wq.github.io/chavruta-app',external=[],errors=[];
 const expected=/src="app\.js\?v=([^"]+)"/.exec(fs.readFileSync('index.html','utf8'))?.[1];assert.ok(expected);
 let ready=false;
 for(let attempt=0;attempt<60;attempt++){
   const response=await fetch(origin+'/index.html?book-check='+Date.now(),{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
   const html=await response.text();
   if(response.ok&&html.includes('src="app.js?v='+expected+'"')){ready=true;break;}
   await new Promise(r=>setTimeout(r,5000));
 }
 assert.ok(ready,'Pages did not publish the expected script version');
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1365,height:1000}});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();external.push(url);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/books?r=8');await page.locator('.books-card').first().waitFor();
  const cards=await page.locator('.books-card').count();assert.equal(cards,47);
  assert.match(await page.locator('.books-pending-sources').innerText(),/מפתחות ומאגרי מאמרים/);
  assert.doesNotMatch(await page.locator('.books-pending-sources').innerText(),/שיוך לספר בבדיקה/);
  const haggadah=page.locator('.books-card').filter({hasText:'הגדה של פסח עם לקוטי טעמים ומנהגים'});
  await haggadah.scrollIntoViewIfNeeded();await haggadah.locator('img').waitFor();
  const cover=await haggadah.locator('img').getAttribute('src');
  assert.match(cover,/^data\/book-covers\/c-46dc297f9c8a413f5d557d8e-[a-f0-9]{16}\.webp$/);
  await haggadah.locator('img').evaluate(img=>img.decode());await page.screenshot({path:'book-snapshot-live.png',fullPage:false});
  await page.goto(origin+'/#/books/g/b/763');await page.locator('.books-book-head h1').waitFor();
  assert.match(await page.locator('.books-book-head').innerText(),/אדה״ז|אדמו["״]ר הזקן/);
  await page.goto(origin+'/#/books/e/11/h/32919');await page.locator('.books-book-head h1').waitFor();
  assert.match(await page.locator('.books-book-head h1').innerText(),/פרשיות ומועדים/);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  const snapshot=await(await context.request.get(origin+'/data/book-snapshot.json?check='+Date.now())).json();
  assert.equal(snapshot.units,57455);assert.equal(snapshot.tocParts.length,33);
  const report={version:expected,cards,units:snapshot.units,tocShards:snapshot.tocParts.length,COLCover:cover,externalRequests:external,pageErrors:errors};
  fs.writeFileSync('book-snapshot-live-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
