// Run after `node build.mjs` with public/ served on 127.0.0.1:8787.
// This suite never sends a contact or chat message.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of [[320,568],[360,640],[390,844],[400,582],[600,582],[601,582],[650,582],[651,582],[768,582],[1024,768],[1440,900]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().url().startsWith(`${BASE_URL}/`) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${BASE_URL}/`);
      for (const scrollY of [0, 40, 100]) {
        await page.evaluate(y => scrollTo(0, y), scrollY);
        const geometry = await page.evaluate(() => {
          const controls = document.querySelector('.film-controls').getBoundingClientRect();
          const chat = document.querySelector('.chat-bubble').getBoundingClientRect();
          return { left: controls.left, right: controls.right, gap: chat.left - controls.right };
        });
        assert(geometry.gap >= 15, `chat clearance ${width}x${height} at scroll ${scrollY}: ${geometry.gap}`);
        assert(geometry.left >= 0, `clipped controls ${width}x${height}`);
        assert(geometry.right <= width, `off-screen controls ${width}x${height}`);
      }
      await page.evaluate(() => scrollTo(0, 0));
      const toggle = page.locator('#motion-toggle');
      for (let repeat = 0; repeat < 2; repeat++) {
        await toggle.click();
        await page.waitForFunction(() => !document.querySelector('#hero-video').paused);
        await toggle.click();
        await page.waitForFunction(() => document.querySelector('#hero-video').paused);
      }
      await page.locator('#replay').click();
      await page.waitForFunction(() => !document.querySelector('#hero-video').paused);
      await toggle.click();
      for (let repeat = 0; repeat < 2; repeat++) {
        await page.locator('.chat-bubble').click();
        assert.equal(await page.locator('.chat-bubble').getAttribute('aria-expanded'), 'true');
        await page.locator('.chat-bubble').click();
        assert.equal(await page.locator('.chat-bubble').getAttribute('aria-expanded'), 'false');
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `/tmp/xdos-film-controls-${width}x${height}.png` });
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: chat clearance, scroll, repeated play/pause/replay, chat open/close`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
