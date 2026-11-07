import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function checkContactConfig(config, mode = 'release') {
    const errors = [];
    if (!['prepare', 'release'].includes(mode)) return ['Mode must be prepare or release'];
    if (config.main !== 'worker/contact.mjs') errors.push('Worker entrypoint is missing');
    if (config.assets?.binding !== 'ASSETS' || !config.assets?.run_worker_first?.includes('/api/*')) errors.push('API/assets routing is incomplete');
    if (!config.ratelimits?.some(r => r.name === 'CONTACT_RATE_LIMITER')) errors.push('Per-IP rate-limit binding is missing');
    if (config.vars?.BREVO_SENDER_EMAIL !== 'noreply@xdosdev.com') errors.push('Unexpected sender');
    const daily = Number(config.vars?.CONTACT_DAILY_LIMIT), hourly = Number(config.vars?.CONTACT_HOURLY_LIMIT);
    if (!Number.isInteger(daily) || daily < 1 || daily > 1000 || !Number.isInteger(hourly) || hourly < 1 || hourly > daily) errors.push('Send budgets must be valid positive integers, with hourly <= daily <= 1000');
    if (mode === 'prepare') {
        if (config.vars?.CONTACT_EMAIL_ENABLED !== 'false') errors.push('Preparation config must keep sending disabled');
    } else {
        if (config.vars?.CONTACT_EMAIL_ENABLED !== 'true') errors.push('Release config must explicitly enable sending');
        if (!/^[A-Za-z0-9_-]{10,100}$/.test(config.vars?.TURNSTILE_SITE_KEY || '') || /^1x000000|^2x000000|^3x000000/.test(config.vars.TURNSTILE_SITE_KEY)) errors.push('A real production Turnstile site key is required');
        if (!config.d1_databases?.some(d => d.binding === 'CONTACT_BUDGET_DB' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.database_id || ''))) errors.push('Add the verified D1 database ID as CONTACT_BUDGET_DB; do not auto-provision during upload');
        for (const secret of ['BREVO_API_KEY', 'TURNSTILE_SECRET_KEY']) {
            if (!config.secrets?.required?.includes(secret)) errors.push(`Declare ${secret} in secrets.required`);
        }
    }
    if ('BREVO_API_KEY' in (config.vars || {}) || 'TURNSTILE_SECRET_KEY' in (config.vars || {})) errors.push('Secrets must never be stored in vars');
    return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const mode = process.argv.includes('--prepare') ? 'prepare' : 'release';
    const path = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) || 'wrangler.jsonc';
    const errors = checkContactConfig(JSON.parse(readFileSync(path, 'utf8')), mode);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`PASS ${mode} configuration structure. This does not verify actual secrets, sender, bindings, database schema, GitHub triggers, or delivery.`);
}
