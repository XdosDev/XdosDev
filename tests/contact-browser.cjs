// Run after building; TEST_BASE_URL defaults to a local static server on 8787.
// Browser requests to /api/contact are always intercepted. No email is sent.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.route('**/*', r => r.request().url().startsWith(`${BASE_URL}/`) ? r.continue() : r.abort());
        await require('./mock-protection.cjs')(context);
        let status = 202, calls = [], release;
        await context.route('**/api/contact', async r => {
            calls.push(r.request().postData());
            if (release) await new Promise(resolve => { release = resolve; });
            await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: status === 202 }) });
        });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        for (const path of ['/', '/solutions/', '/solutions/jadicoq-erp/', '/solutions/studymate-schools/', '/solutions/studymate-ums/', '/solutions/learnbee/', '/solutions/naijaxch/', '/solutions/rosca/']) {
            await page.goto(`${BASE_URL}${path}`);
            const form = page.locator('.js-form');
            assert.equal(await form.count(), 1);
            assert.equal(await form.getAttribute('action'), '/api/contact');
            assert.equal(await page.locator('#chatForm').getAttribute('action'), '/api/contact');
            await form.locator('[name=name]').fill('Test Person');
            await form.locator('[name=email]').fill('test@example.com');
            const message = form.locator('[name=message]');
            if (await message.count()) await message.fill('Local mocked browser test only');
            const before = calls.length;
            await form.locator('[type=submit]').click();
            await page.locator('.form-message.success').waitFor();
            assert.equal(calls.length, before + 1);
            assert.equal(await form.locator('[name=name]').inputValue(), '');
            assert.match(calls.at(-1), /test@example.com/);
            console.log(`PASS ${path}: form wiring, notification payload, reset`);
        }
        await page.goto(`${BASE_URL}/`);
        const form = page.locator('.js-form');
        await form.locator('[name=name]').fill('Test');
        await form.locator('[name=email]').fill('test@example.com');
        await form.locator('[name=message]').fill('Keep this text');
        status = 429;
        await form.locator('[type=submit]').click();
        await page.locator('.form-message.error').waitFor();
        assert.match(await page.locator('.form-message.error').innerText(), /wait a minute/i);
        assert.equal(await form.locator('[name=message]').inputValue(), 'Keep this text');
        status = 202; release = true; let before = calls.length;
        await form.evaluate(f => { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
        await page.waitForTimeout(100);
        assert.equal(calls.length, before + 1);
        assert.equal(await form.locator('[name=message]').isDisabled(), true);
        assert.equal(await form.locator('[name=email]').isDisabled(), true);
        release(); release = null;
        await page.locator('.form-message.success').waitFor();
        assert.equal(await form.locator('[name=message]').isDisabled(), false);
        await page.locator('.chat-bubble').click();
        for (const text of ['Test', 'test@example.com']) { await page.locator('#chatInput').fill(text); await page.locator('.chat-send').click(); }
        status = 503;
        await page.locator('#chatInput').fill('Restore my chat');
        await page.locator('.chat-send').click();
        await page.waitForFunction(() => document.querySelector('#chatInput').value === 'Restore my chat');
        assert.match(await page.locator('#chatMessages').innerText(), /message is restored/);
        assert.match(calls.at(-1), /enquiry_type[\s\S]*chat/);
        status = 202; release = true; before = calls.length;
        await page.locator('#chatForm').evaluate(f => { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
        await page.waitForTimeout(100); assert.equal(calls.length, before + 1);
        assert.equal(await page.locator('#chatInput').isDisabled(), true);
        release(); release = null;
        await page.waitForFunction(() => !document.querySelector('#chatInput').disabled);
        assert.equal(await page.locator('#chatInput').inputValue(), '');
        assert.deepEqual(errors, []);
        console.log('PASS rate limit feedback, preserved fields, duplicate guards, chat retry and reset');
        await context.close();
        const native = await browser.newContext({ javaScriptEnabled: false });
        await native.route('**/*', r => r.request().url().startsWith(`${BASE_URL}/`) ? r.continue() : r.abort());
        let nativeRequests = 0;
        await native.route('**/api/contact', r => { nativeRequests++; return r.abort(); });
        const nojs = await native.newPage(); await nojs.goto(`${BASE_URL}/`);
        assert.equal(await nojs.locator('.js-form').isVisible(), false);
        assert(await nojs.locator('.form-nojs a').isVisible());
        assert.equal(await nojs.locator('.form-nojs a').getAttribute('href'), 'mailto:info@xdosdev.com');
        assert.equal(nativeRequests, 0);
        console.log('PASS no-JavaScript direct email fallback without unprotected submission');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
