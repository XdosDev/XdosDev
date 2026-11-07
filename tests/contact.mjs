// Built-in Node tests. Every Brevo request is mocked; no live credentials needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleContact as rawHandleContact } from '../worker/contact.mjs';
import { readFileSync } from 'node:fs';

const verifyOK = async (url, options) => { assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify'); assert.equal(JSON.parse(options.body).secret, 'fake-turnstile-secret'); return Response.json({ success: true, hostname: 'xdosdev.com', action: 'contact' }); };
const handleContact = (request, env, send) => rawHandleContact(request, env, send, async (url, options) => { const res = await verifyOK(url, options); const value = await res.json(); value.hostname = new URL(request.headers.get('Origin')).hostname; return Response.json(value); });
const env = () => ({ TURNSTILE_SECRET_KEY: 'fake-turnstile-secret', TURNSTILE_SITE_KEY: 'fake-public-site-key', CONTACT_DAILY_LIMIT: '100', CONTACT_HOURLY_LIMIT: '20', CONTACT_BUDGET_DB: { prepare() { return { bind() { return { async first() { return { day_count: 1, hour_count: 1 }; } }; } }; } }, CONTACT_EMAIL_ENABLED: 'true', BREVO_API_KEY: 'not-a-real-key', BREVO_SENDER_EMAIL: 'noreply@xdosdev.com', CONTACT_RATE_LIMITER: { async limit() { return { success: true }; } } });
const form = { name: 'Test Person', email: 'test@example.com', enquiry_type: 'contact', message: 'Local mocked test only', _gotcha: '', submission_id: 'f121f121-1234-4123-8123-123456789abc', 'cf-turnstile-response': 'fake-single-use-token' };
function request(values = {}, headers = {}, options = {}) {
    return new Request('https://xdosdev.com/api/contact', {
        method: 'POST',
        headers: { Origin: 'https://xdosdev.com', Accept: 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers },
        body: new URLSearchParams({ ...form, ...values }), ...options,
    });
}
const noSend = () => { assert.fail('Must not call Brevo'); };

test('sender, recipient and Reply-To are controlled; content is escaped and no metadata leaks', async () => {
    let calls = 0;
    const response = await handleContact(request({ name: '<svg/onload=alert(1)>', message: '<script>bad</script> & test', _subject: 'Spoofed', page: '/solutions/' }), env(), async (url, init) => {
        calls++;
        assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
        assert.equal(init.headers['api-key'], 'not-a-real-key');
        assert.equal(init.redirect, 'error');
        const data = JSON.parse(init.body);
        assert.deepEqual(data.to, [{ email: 'admin@xdosdev.com', name: 'XdosDev' }]);
        assert.equal(data.sender.email, 'noreply@xdosdev.com');
        assert.equal(data.replyTo.email, 'test@example.com');
        assert.equal(data.subject, 'XdosDev website: contact');
        assert.match(data.textContent, /<script>bad<\/script>/);
        assert.doesNotMatch(data.htmlContent, /<script>|<svg/);
        assert.match(data.htmlContent, /&lt;script&gt;/);
        assert.doesNotMatch(init.body, /192\.0\.2\.1|not-a-real-key|Spoofed|_gotcha/);
        assert(init.signal instanceof AbortSignal);
        return new Response('{"messageId":"mock-id"}', { status: 201 });
    });
    assert.equal(calls, 1);
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal((await response.json()).ok, true);
});

for (const enquiry_type of ['contact', 'general', 'demo', 'waitlist', 'chat']) {
    test(`accepts ${enquiry_type}`, async () => {
        const response = await handleContact(request({ enquiry_type, product: enquiry_type === 'waitlist' ? 'NaijaXch' : '' }), env(), async () => new Response('', { status: 201 }));
        assert.equal(response.status, 202);
    });
}
for (const enquiry_type of ['demo', 'general', 'waitlist']) {
    test(`preserves optional message for ${enquiry_type}`, async () => {
        assert.equal((await handleContact(request({ enquiry_type, message: '', product: 'NaijaXch' }), env(), async () => new Response('', { status: 201 }))).status, 202);
    });
}
for (const origin of ['https://evil.example', 'null', 'https://xdosdev.com.evil.example', 'http://xdosdev.com', '']) {
    test(`rejects unapproved Origin ${origin}`, async () => assert.equal((await handleContact(request({}, { Origin: origin }), env(), noSend)).status, 403));
}
test('accepts www origin', async () => assert.equal((await handleContact(request({}, { Origin: 'https://www.xdosdev.com' }), env(), async () => new Response('', { status: 201 }))).status, 202));
test('accepts the www endpoint with a token for its exact hostname', async () => {
    const r = new Request('https://www.xdosdev.com/api/contact', request({}, { Origin: 'https://www.xdosdev.com' }));
    assert.equal((await rawHandleContact(r, env(), async () => new Response('', { status: 201 }), async () => Response.json({ success: true, hostname: 'www.xdosdev.com', action: 'contact' }))).status, 202);
});
test('rejects cross-site fetch metadata', async () => assert.equal((await handleContact(request({}, { 'Sec-Fetch-Site': 'cross-site' }), env(), noSend)).status, 403));
test('requires Origin even if Referer is valid', async () => {
    const r = request({}, { Referer: 'https://xdosdev.com/' }); r.headers.delete('Origin');
    assert.equal((await handleContact(r, env(), noSend)).status, 403);
});
for (const method of ['GET', 'OPTIONS', 'PUT']) {
    test(`rejects ${method}`, async () => {
        const r = new Request('https://xdosdev.com/api/contact', { method });
        const response = await handleContact(r, env(), noSend);
        assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST');
    });
}
for (const key of ['CONTACT_EMAIL_ENABLED', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'CONTACT_RATE_LIMITER', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_SITE_KEY', 'CONTACT_BUDGET_DB', 'CONTACT_DAILY_LIMIT', 'CONTACT_HOURLY_LIMIT']) {
    test(`fails closed without ${key}`, async () => { const e = env(); delete e[key]; assert.equal((await handleContact(request(), e, noSend)).status, 503); });
}
test('fails closed if limiter throws', async () => {
    const e = env(); e.CONTACT_RATE_LIMITER.limit = async () => { throw Error('private error'); };
    const r = await handleContact(request(), e, noSend);
    assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /private/);
});
test('uses only trusted edge IP for rate limiting', async () => {
    const e = env(); e.CONTACT_RATE_LIMITER.limit = async ({ key }) => { assert.equal(key, 'xdosdev-contact:192.0.2.1'); return { success: false }; };
    const r = await handleContact(request({}, { 'X-Forwarded-For': 'spoofed' }), e, noSend);
    assert.equal(r.status, 429); assert.equal(r.headers.get('retry-after'), '60');
});
test('missing edge IP fails closed', async () => { const r = request(); r.headers.delete('CF-Connecting-IP'); assert.equal((await handleContact(r, env(), noSend)).status, 503); });
test('honeypot pretends success without sending', async () => assert.equal((await handleContact(request({ _gotcha: 'bot' }), env(), noSend)).status, 202));
for (const values of [
    { name: '' }, { email: 'invalid' }, { email: 'test@example.com\r\nBcc: victim@example.com' },
    { name: 'Test\nInjected' }, { message: '\u0000bad' }, { name: 'x'.repeat(101) },
    { message: 'x'.repeat(5001) }, { message: '' }, { enquiry_type: 'unknown' },
    { enquiry_type: 'waitlist', product: '' }, { to: 'attacker@example.com' },
    { page: 'https://evil.example' }, { page: '/?password=secret' },
]) {
    test(`rejects invalid fields ${JSON.stringify(values).slice(0, 90)}`, async () => assert.equal((await handleContact(request(values), env(), noSend)).status, 400));
}
test('rejects duplicate fields', async () => { const body = new URLSearchParams(form); body.append('email', 'other@example.com'); assert.equal((await handleContact(request({}, {}, { body }), env(), noSend)).status, 400); });
test('accepts multipart native FormData', async () => { const body = new FormData(); for (const [key, value] of Object.entries(form)) body.append(key, value); assert.equal((await handleContact(request({}, {}, { body }), env(), async () => new Response('', { status: 201 }))).status, 202); });
test('rejects uploaded files', async () => { const body = new FormData(); for (const [key, value] of Object.entries(form)) body.append(key, value); body.set('message', new Blob(['file']), 'test.txt'); assert.equal((await handleContact(request({}, {}, { body }), env(), noSend)).status, 400); });
test('rejects malformed multipart', async () => assert.equal((await handleContact(request({}, { 'Content-Type': 'multipart/form-data; boundary=wrong' }, { body: 'not multipart' }), env(), noSend)).status, 400));
test('rejects JSON submissions', async () => assert.equal((await handleContact(request({}, { 'Content-Type': 'application/json' }, { body: '{}' }), env(), noSend)).status, 415));
test('rejects oversized content length', async () => assert.equal((await handleContact(request({}, { 'Content-Length': '70000' }), env(), noSend)).status, 413));
test('rejects oversized stream without content length', async () => assert.equal((await handleContact(request({ message: 'x'.repeat(70000) }), env(), noSend)).status, 413));
for (const status of [200, 400, 401, 403, 429, 500]) {
    test(`does not claim success for Brevo ${status} or leak provider response`, async () => {
        let calls = 0;
        const r = await handleContact(request(), env(), async () => { calls++; return new Response('not-a-real-key private provider error', { status }); });
        assert.equal(r.status, 502); assert.equal(calls, 1); assert.doesNotMatch(await r.text(), /not-a-real-key|private/);
    });
}
test('network timeout is not retried or exposed', async () => {
    let calls = 0; const r = await handleContact(request(), env(), async () => { calls++; throw new DOMException('private timeout', 'TimeoutError'); });
    assert.equal(r.status, 503); assert.equal(calls, 1); assert.doesNotMatch(await r.text(), /private/);
});
test('valid non-AJAX success is accessible HTML without reflected input', async () => {
    const r = await handleContact(request({ name: '<script>bad</script>' }, { Accept: 'text/html' }), env(), async () => new Response('', { status: 201 }));
    assert.equal(r.status, 202); assert.match(r.headers.get('content-type'), /text\/html/);
    assert.match(await r.text(), /<h1>Thank you/); assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
});
test('HTML errors explain the email fallback', async () => {
    const r = await handleContact(request({ email: 'invalid' }, { Accept: 'text/html' }), env(), noSend);
    assert.equal(r.status, 400); assert.match(await r.text(), /mailto:info@xdosdev.com/);
});
test('non-API pages and assets retain static routing', async () => {
    const r = new Request('https://xdosdev.com/solutions/');
    assert.equal(await (await worker.fetch(r, { ASSETS: { fetch: async actual => { assert.equal(actual, r); return new Response('asset'); } } })).text(), 'asset');
});
test('deployment configuration uses valid enable flag and API runs before assets', () => {
    const conf = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url)));
    assert.equal(conf.main, 'worker/contact.mjs'); assert(['true', 'false'].includes(conf.vars.CONTACT_EMAIL_ENABLED));
    assert.equal(conf.assets.binding, 'ASSETS'); assert.deepEqual(conf.assets.run_worker_first, ['/api/*']);
    assert.equal(conf.ratelimits[0].name, 'CONTACT_RATE_LIMITER'); assert.equal(conf.ratelimits[0].simple.period, 60);
});

for (const encoding of ['urlencoded', 'multipart']) {
    test(`accepts maximum-length multilingual ${encoding} form`, async () => {
        const entries = { ...form, message: '界'.repeat(5000), name: '界'.repeat(100), organisation: '界'.repeat(200) };
        const body = encoding === 'urlencoded' ? new URLSearchParams(entries) : new FormData();
        if (encoding === 'multipart') for (const [key, value] of Object.entries(entries)) body.append(key, value);
        assert.equal((await handleContact(request({}, {}, { body }), env(), async () => new Response('', { status: 201 }))).status, 202);
    });
}

for (const url of ['https://xdosdev.other.workers.dev/api/contact', 'https://preview.example/api/contact', 'https://other.xdosdev.com/api/contact', 'http://xdosdev.com/api/contact', 'https://xdosdev.com:8443/api/contact']) {
    test(`rejects alternate endpoint ${url}`, async () => {
        const r = request(); const alternate = new Request(url, r);
        assert.equal((await handleContact(alternate, env(), noSend)).status, 403);
    });
}
for (const validation of [{success:false}, {success:true,hostname:'evil.example',action:'contact'}, {success:true,hostname:'xdosdev.com',action:'other'}, {success:true,hostname:'www.xdosdev.com',action:'contact'}]) {
    test(`rejects invalid Turnstile ${JSON.stringify(validation)}`, async () => {
        assert.equal((await rawHandleContact(request(), env(), noSend, async () => Response.json(validation))).status, 403);
    });
}
test('missing token is rejected before verification', async () => assert.equal((await rawHandleContact(request({'cf-turnstile-response':''}), env(), noSend, noSend)).status,403));
test('Turnstile failure never reaches Brevo', async () => {
    const r = await rawHandleContact(request(), env(), noSend, async () => { throw new Error('private'); });
    assert.equal(r.status,503); assert.equal((await r.json()).outcome,'not_sent');
});
test('exhausted global budget never reaches Brevo', async () => {
    const e = env(); e.CONTACT_BUDGET_DB.prepare = () => ({bind: () => ({first:async () => null})});
    assert.equal((await handleContact(request(),e,noSend)).status,503);
});
test('global budget failure fails closed', async () => {
    const e = env(); e.CONTACT_BUDGET_DB.prepare = () => {throw new Error('private DB error');};
    assert.equal((await handleContact(request(),e,noSend)).status,503);
});
test('Brevo receives the stable submission idempotency key', async () => {
    assert.equal((await handleContact(request(), env(), async (url, init) => { assert.equal(JSON.parse(init.body).headers.idempotencyKey, form.submission_id); return new Response('',{status:201}); })).status,202);
});
test('timeout describes uncertain outcome', async () => {
    const r = await handleContact(request(),env(),async () => { throw new DOMException('timeout','TimeoutError');});
    const data = await r.json(); assert.equal(data.outcome,'unconfirmed'); assert.match(data.message,/could not confirm/); assert.doesNotMatch(data.message,/was not sent/);
});
test('Brevo duplicate id is not falsely reported as newly delivered', async () => {
    const r = await handleContact(request(),env(),async () => Response.json({code:'duplicate_parameter',message:'Email for the idempotency key has already been processed'},{status:400}));
    assert.equal(r.status,409); assert.equal((await r.json()).outcome,'unconfirmed');
});
test('public config exposes only site key', async () => {
    const r = await worker.fetch(new Request('https://xdosdev.com/api/contact-config'),env());
    assert.deepEqual(await r.json(),{enabled:true,siteKey:'fake-public-site-key'});
});
test('public config rejects alternate hostname', async () => assert.equal((await worker.fetch(new Request('https://preview.workers.dev/api/contact-config'),env())).status,403));
test('disabled public config hides key', async () => {
    const e=env(); e.CONTACT_EMAIL_ENABLED='false';
    assert.deepEqual(await (await worker.fetch(new Request('https://xdosdev.com/api/contact-config'),e)).json(),{enabled:false,siteKey:null});
});
