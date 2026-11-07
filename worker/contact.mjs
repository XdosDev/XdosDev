import { reserveSendBudget } from './budget.mjs';
// Server-only entrypoint. Never copy this file or secrets into public/.
const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const RECIPIENT = 'admin@xdosdev.com';
const MAX_BODY_BYTES = 64 * 1024;
const ORIGINS = new Set(['https://xdosdev.com', 'https://www.xdosdev.com']);
const HOSTNAMES = new Set(['xdosdev.com', 'www.xdosdev.com']);
const TYPES = new Set(['contact', 'general', 'demo', 'waitlist', 'chat']);
const LIMITS = { name: 100, email: 254, organisation: 200, phone: 60, message: 5000, product: 120, interest: 120, enquiry_type: 16, page: 300, _subject: 250, _gotcha: 200, 'cf-turnstile-response': 2048, submission_id: 36 };
const EMAIL = /^[^\s<>@,;"\\]+@[^\s<>@,;"\\]+\.[^\s<>@,;"\\]+$/;
const SUCCESS = 'Thanks! Your request has been sent. We will reply by email.';
const UNAVAILABLE = 'Your request was not sent. Please try again later, or email info@xdosdev.com.';
const UNCERTAIN = 'We could not confirm whether your request was sent. Please wait before retrying to avoid a duplicate, or email info@xdosdev.com.';

class FormError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}

function respond(request, status, message, extra = {}, outcome = status < 300 ? 'accepted' : 'not_sent') {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra };
    const ok = status >= 200 && status < 300;
    if (request.headers.get('accept')?.includes('application/json')) {
        return Response.json({ ok, message, outcome }, { status, headers });
    }
    // Only fixed server messages appear in this HTML, never submitted values.
    headers['Content-Type'] = 'text/html; charset=utf-8';
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? 'Request accepted' : outcome === 'unconfirmed' ? 'Delivery not confirmed' : 'Request not sent'} | XdosDev</title><link rel="stylesheet" href="/styles.css"><main class="container section"><h1>${ok ? 'Thank you' : outcome === 'unconfirmed' ? 'Delivery not confirmed' : 'Request not sent'}</h1><p>${message}</p><p><a href="/">Return to XdosDev</a> · <a href="mailto:info@xdosdev.com">Email us</a></p>${ok ? '' : '<p>Use your browser’s Back button to return to the form.</p>'}</main></html>`, { status, headers });
}

async function readForm(request) {
    const type = request.headers.get('content-type') || '';
    if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(type)) {
        throw new FormError('Please submit the website enquiry form.', 415);
    }
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
        throw new FormError('Your request is too long. Please shorten your message.', 413);
    }
    // Do not trust Content-Length: enforce the limit while streaming too.
    const reader = request.body?.getReader();
    if (!reader) throw new FormError('Please complete the enquiry form.');
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BODY_BYTES) {
                await reader.cancel();
                throw new FormError('Your request is too long. Please shorten your message.', 413);
            }
            chunks.push(value);
        }
    } finally { reader.releaseLock(); }
    let form;
    try { form = await new Response(new Blob(chunks), { headers: { 'Content-Type': type } }).formData(); }
    catch { throw new FormError('Please complete the enquiry form.'); }
    const values = {};
    for (const [key, value] of form) {
        if (!Object.hasOwn(LIMITS, key) || Object.hasOwn(values, key) || typeof value !== 'string') {
            throw new FormError('Please submit the website enquiry form.');
        }
        if (value.length > LIMITS[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || (key !== 'message' && /[\r\n]/.test(value))) {
            throw new FormError('Please check the length and format of your form fields.');
        }
        values[key] = value.trim();
    }
    return values;
}

export async function handleContact(request, env, send = fetch, verify = fetch) {
    const url = new URL(request.url);
    if (url.protocol !== 'https:' || !HOSTNAMES.has(url.hostname) || url.port) {
        return respond(request, 403, 'Please submit the form on xdosdev.com.');
    }
    if (request.method !== 'POST') return respond(request, 405, 'Please submit the website enquiry form.', { Allow: 'POST' });
    const origin = request.headers.get('origin');
    // Require an actual approved website Origin, not Referer or Host reflection.
    if (!ORIGINS.has(origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
        return respond(request, 403, 'Please submit the form on xdosdev.com.');
    }
    if (env.CONTACT_EMAIL_ENABLED !== 'true' || !env.BREVO_API_KEY || !EMAIL.test(env.BREVO_SENDER_EMAIL || '') || !env.CONTACT_RATE_LIMITER?.limit || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || !env.CONTACT_BUDGET_DB?.prepare || !Number.isInteger(Number(env.CONTACT_DAILY_LIMIT)) || Number(env.CONTACT_DAILY_LIMIT) < 1 || !Number.isInteger(Number(env.CONTACT_HOURLY_LIMIT)) || Number(env.CONTACT_HOURLY_LIMIT) < 1) {
        return respond(request, 503, UNAVAILABLE);
    }
    let sendStarted = false;
    try {
        // Cloudflare sets this header at its edge. No X-Forwarded-For fallback.
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) return respond(request, 503, UNAVAILABLE);
        const rate = await env.CONTACT_RATE_LIMITER.limit({ key: `xdosdev-contact:${ip}` });
        if (!rate.success) return respond(request, 429, 'Too many requests. Please wait a minute before trying again.', { 'Retry-After': '60' });
        const values = await readForm(request);
        // Preserve the existing honeypot, including for chat. Do not send spam.
        if (values._gotcha) return respond(request, 202, SUCCESS);
        if (!values.name || !EMAIL.test(values.email || '') || !TYPES.has(values.enquiry_type)) {
            throw new FormError('Please provide your name and a valid email address.');
        }
        if (['contact', 'chat'].includes(values.enquiry_type) && !values.message) {
            throw new FormError('Please include a message.');
        }
        if (values.enquiry_type === 'waitlist' && !values.product) {
            throw new FormError('Please choose a product waitlist.');
        }
        if (values.page && (!values.page.startsWith('/') || /[?#]/.test(values.page))) {
            throw new FormError('Please submit the website enquiry form.');
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(values.submission_id || '')) {
            throw new FormError('Please reload the page and submit the form again.');
        }
        if (!values['cf-turnstile-response']) throw new FormError('Please complete the spam-protection check.', 403);
        const verification = await verify(VERIFY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: values['cf-turnstile-response'] }),
            signal: AbortSignal.timeout(10000), redirect: 'error',
        });
        if (!verification.ok) return respond(request, 503, 'Spam protection is unavailable. Your request was not sent. Please try again later.');
        const validation = await verification.json();
        if (validation.success !== true || validation.hostname !== new URL(origin).hostname || validation.action !== 'contact') {
            throw new FormError('The spam-protection check expired or failed. Please try again.', 403);
        }
        if (!await reserveSendBudget(env.CONTACT_BUDGET_DB, Number(env.CONTACT_DAILY_LIMIT), Number(env.CONTACT_HOURLY_LIMIT))) {
            // Operational event only, with no submitted data or credentials.
            console.warn('contact_send_budget_unavailable');
            return respond(request, 503, 'The contact form is temporarily busy. Your request was not sent. Please email info@xdosdev.com.');
        }
        // Only the server controls recipient, sender and subject. No auto-replies
        // or contact-list subscription is created by this notification endpoint.
        const fields = [
            ['Enquiry type', values.enquiry_type], ['Product', values.product],
            ['Name', values.name], ['Email', values.email], ['Organisation', values.organisation],
            ['Phone / WhatsApp', values.phone], ['Interest', values.interest], ['Page', values.page],
            ['Message', values.message],
        ];
        const textContent = fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join('\n\n');
        const htmlContent = `<pre>${textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</pre>`;
        sendStarted = true;
        const response = await send(ENDPOINT, {
            method: 'POST',
            headers: { 'api-key': env.BREVO_API_KEY, Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: { email: env.BREVO_SENDER_EMAIL, name: 'XdosDev website' },
                to: [{ email: RECIPIENT, name: 'XdosDev' }],
                replyTo: { email: values.email, name: values.name },
                subject: `XdosDev website: ${values.enquiry_type}`,
                headers: { idempotencyKey: values.submission_id },
                textContent, htmlContent, tags: ['website-enquiry'],
            }),
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
        });
        // A 201 means accepted by Brevo, not proof of inbox delivery. No retries:
        // a timeout may already have queued a message at the provider.
        if (response.status !== 201) {
            if (response.status === 400) {
                const error = await response.json().catch(() => null);
                if (error?.code === 'duplicate_parameter' && /idempotency/i.test(error.message || '')) {
                    return respond(request, 409, 'This request was already processed. Please wait for our reply rather than sending it again.', {}, 'unconfirmed');
                }
            }
            return respond(request, 502, response.status >= 500 ? UNCERTAIN : UNAVAILABLE, {}, response.status >= 500 ? 'unconfirmed' : 'not_sent');
        }
        return respond(request, 202, SUCCESS);
    } catch (error) {
        if (error instanceof FormError) return respond(request, error.status, error.message);
        // Do not log payloads, IPs, keys, upstream response bodies or exceptions.
        return respond(request, 503, sendStarted ? UNCERTAIN : UNAVAILABLE, {}, sendStarted ? 'unconfirmed' : 'not_sent');
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/contact-config') {
            if (request.method !== 'GET' || url.protocol !== 'https:' || !HOSTNAMES.has(url.hostname) || url.port) return respond(request, 403, 'Please use xdosdev.com.');
            const enabled = env.CONTACT_EMAIL_ENABLED === 'true' && Boolean(env.TURNSTILE_SITE_KEY);
            return Response.json({ enabled, siteKey: enabled ? env.TURNSTILE_SITE_KEY : null }, { headers: { 'Cache-Control': 'no-store' } });
        }
        if (url.pathname === '/api/contact') return handleContact(request, env);
        return env.ASSETS.fetch(request);
    },
};
