import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContactConfig } from '../scripts/check-contact-config.mjs';
const current = JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url)));
const release = () => ({...current, vars:{...current.vars, CONTACT_EMAIL_ENABLED:'true', TURNSTILE_SITE_KEY:'real-looking-fixture-key'}, secrets:{required:['BREVO_API_KEY','TURNSTILE_SECRET_KEY']}, d1_databases:[{binding:'CONTACT_BUDGET_DB',database_id:'12345678-1234-1234-1234-123456789abc'}]});
test('enabled staged release passes structural checks',()=>assert.deepEqual(checkContactConfig(release()),[]));
test('configured public Turnstile key passes release structure when other prerequisites exist',()=>{const c=release();c.vars.TURNSTILE_SITE_KEY=current.vars.TURNSTILE_SITE_KEY;assert.deepEqual(checkContactConfig(c),[]);});
test('configured production public bindings pass structure when sending is enabled',()=>{const c={...current,vars:{...current.vars,CONTACT_EMAIL_ENABLED:'true'}};assert.deepEqual(checkContactConfig(c),[]);assert.equal(c.d1_databases.find(d=>d.binding==='CONTACT_BUDGET_DB').database_name,'xdosdev-contact-budget');});
test('preparation safety is explicit and separate',()=>{const c=release();assert(checkContactConfig(c,'prepare').length);c.vars.CONTACT_EMAIL_ENABLED='false';assert.deepEqual(checkContactConfig(c,'prepare'),[]);});
test('release check rejects disabled delivery',()=>{const c=release();c.vars.CONTACT_EMAIL_ENABLED='false';assert(checkContactConfig(c).some(x=>x.includes('enable')));});
test('release check rejects missing global budget binding',()=>{const c=release();delete c.d1_databases;assert(checkContactConfig(c).some(x=>x.includes('D1')));});
test('release check rejects public secrets and dummy Turnstile keys',()=>{const c=release();c.vars.BREVO_API_KEY='never-store-here';c.vars.TURNSTILE_SITE_KEY='1x00000000000000000000AA';assert.equal(checkContactConfig(c).length,2);});

test('release check requires the approved noreply sender, not the recipient',()=>{const c=release();c.vars.BREVO_SENDER_EMAIL='admin@xdosdev.com';assert(checkContactConfig(c).includes('Unexpected sender'));});
