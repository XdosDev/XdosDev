// Run after `node build.mjs` with a local server on port 8787.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://static.cloudflareinsights.com/**',r=>r.abort());
  await page.goto('http://127.0.0.1:8787');
  assert.equal(await page.locator('h1').count(),1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  assert.equal(await page.locator('#hero-video').getAttribute('src'),null);
  await page.locator('[data-product="1"]').click();assert.equal(await page.locator('#feature-link').getAttribute('href'),'/solutions/jadicoq-erp/');
  await page.locator('[data-filter="business"]').click();assert.equal(await page.locator('.product:visible').count(),1);
  await page.locator('[data-filter="education"]').click();assert.equal(await page.locator('.product:visible').count(),3);
  await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('.product:visible').count(),4);
  await page.locator('.draw-product').first().click();assert.equal(await page.locator('#reveal-1').inputValue(),'0');
  await page.locator('#reveal-1').focus();await page.keyboard.press('End');assert.equal(await page.locator('#reveal-1').inputValue(),'100');
  await page.locator('[data-base="Mobile app"]').click();await page.locator('[data-module="Payments"]').click();assert((await page.locator('#brief-link').getAttribute('href')).includes('Mobile%20app'));
  await page.locator('[data-rsu="access"]').click();assert.equal(await page.locator('.rsu-canvas').getAttribute('data-view'),'access');
  await page.locator('[data-rsu="overview"]').click();
  const form=page.locator('.js-form');await form.locator('[name="name"]').fill('Test Person');await form.locator('[name="email"]').fill('test@example.com');await form.locator('[name="message"]').fill('Local intercepted test only');
  await page.route('https://formspree.io/**',r=>r.fulfill({status:500,body:'{}'}));await form.locator('[type="submit"]').click();await page.locator('.form-message.error').waitFor();assert.equal(await form.locator('[name="message"]').inputValue(),'Local intercepted test only');
  await page.route('https://formspree.io/**',r=>r.fulfill({status:200,body:'{}'}));await form.locator('[type="submit"]').click();await page.locator('.form-message.success').waitFor();assert.equal(await form.locator('[name="message"]').inputValue(),'');
  await page.locator('.chat-bubble').click();await page.locator('#chatInput').fill('Test');await page.locator('.chat-send').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.chat-widget').evaluate(e=>e.classList.contains('open')),false);
  if(width<768){await page.locator('.nav-toggle').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'false');}
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`/tmp/xdos-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: layout, filters, film fallback, slider, idea builder, RSU, mocked form success/error, chat, navigation`);await context.close();
 }
 const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const p=await c.newPage();await p.goto('http://127.0.0.1:8787');assert.equal(await p.locator('.product').count(),4);assert(await p.locator('.js-form').isVisible());console.log('PASS no-JavaScript content and native form');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
