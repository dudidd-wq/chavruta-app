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
  await page.goto(origin+'/#/books?r=8');
  const cardsLocator=page.locator('.books-card');
  const failed=page.getByText('לא ניתן לטעון את המהדורות כעת');
  try { await cardsLocator.first().waitFor({state:'visible',timeout:30000}); }
  catch (err) {
    if (await failed.count()) throw new Error('Live editions shelf failed to load (catalog/tree mismatch or load error)');
    throw err;
  }
  const cards=await cardsLocator.count();
  assert.ok(cards>=12,'expected at least 12 shelf cards for the Rebbe, got '+cards);
  // Search so the Haggadah card is on screen even if the Rebbe's shelf is paginated.
  const search=page.locator('input[type="search"][aria-label="חיפוש ספר"]');
  await search.fill('הגדה של פסח');
  const haggadah=page.locator('.books-card').filter({hasText:'הגדה של פסח עם לקוטי טעמים ומנהגים'}).first();
  await haggadah.waitFor({state:'visible',timeout:10000});
  await haggadah.evaluate(el=>{el.scrollIntoView({block:'center',inline:'nearest'});window.scrollBy(0,1);window.scrollBy(0,-1);});
  const coverHost=haggadah.locator('.books-cover');
  const img=coverHost.locator('img');
  try { await img.waitFor({state:'visible',timeout:30000}); }
  catch (err) {
    const hostText=(await coverHost.innerText().catch(()=>''))||'';
    if (/הצילום לא נטען|צילום השער בהכנה|צילום שער אינו זמין/.test(hostText)) throw new Error('Haggadah cover failed to load: '+hostText);
    throw new Error('Haggadah cover img did not appear (host: '+hostText+')');
  }
  const cover=await img.getAttribute('src');
  assert.match(cover,/^data\/book-covers\/c-46dc297f9c8a413f5d557d8e-[a-f0-9]{16}\.webp$/);
  await img.evaluate(el=>el.decode());await page.screenshot({path:'book-snapshot-live.png',fullPage:false});
  // Tanya (series 8) is a stable Alter Rebbe work; book ids such as 763 shift as the catalog grows.
  await page.goto(origin+'/#/books/g/s/8');await page.locator('.books-book-head h1').waitFor();
  assert.match(await page.locator('.books-book-head').innerText(),/אדה״ז|אדמו["״]ר הזקן/);
  assert.match(await page.locator('.books-book-head h1').innerText(),/תניא|לקוטי אמרים/);
  await page.goto(origin+'/#/books/e/11/h/32919');await page.locator('.books-book-head h1').waitFor();
  assert.match(await page.locator('.books-book-head h1').innerText(),/פרשיות ומועדים/);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  const snapshot=await(await context.request.get(origin+'/data/book-snapshot.json?check='+Date.now())).json();
  assert.equal(snapshot.schema,1);
  assert.ok(Number.isInteger(snapshot.units)&&snapshot.units>0,'snapshot.units should be a positive integer');
  assert.ok(Array.isArray(snapshot.tocParts),'snapshot.tocParts should be an array');
  const report={version:expected,cards,units:snapshot.units,tocShards:snapshot.tocParts.length,COLCover:cover,externalRequests:external,pageErrors:errors};
  fs.writeFileSync('book-snapshot-live-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
