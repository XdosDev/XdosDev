// Browser-only fake: no Cloudflare challenge endpoint is contacted in tests.
module.exports = async context => {
    await context.route('**/api/contact-config', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({enabled:true,siteKey:'test-public-key'}) }));
    await context.addInitScript(() => {
        let next = 0; const widgets = new Map();
        window.__challengeCalls = 0;
        window.turnstile = {
            render(container, options) { const id = ++next; widgets.set(id, options); return id; },
            execute(id) { const o = widgets.get(id); window.__challengeCalls++; queueMicrotask(() => window.__challengeFails ? o['error-callback']() : o.callback(`fake-token-${id}`)); },
            remove(id) { widgets.delete(id); },
        };
    });
};
