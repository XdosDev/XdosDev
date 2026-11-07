// Exercise the exact client submit/protection helper without browser/network.
// This supplements, not replaces, the full browser suites.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/assets/script.js',import.meta.url),'utf8');
const helper = source.slice(source.indexOf('    let protection;'),source.indexOf("    $$('.js-form').forEach"));
function harness() {
    const state = { sends: [], tokens: 0, removed: 0, failChallenge: false, failSend: false, status: 202, response: {ok:true} };
    let options;
    const context = { FormData, AbortSignal, crypto, setTimeout, clearTimeout, console,
        window: { turnstile: {
            render(_,o) {options=o;return 1;},
            execute() {state.tokens++;queueMicrotask(()=>state.failChallenge?options['error-callback']():options.callback(`token-${state.tokens}`));},
            remove() {state.removed++;},
        } },
        document:{createElement() { return {remove(){}};}},
        fetch:async (url,init) => {
            if(url==='/api/contact-config') return Response.json({enabled:true,siteKey:'fake-site-key'});
            state.sends.push(Object.fromEntries(init.body));
            if(state.failSend) throw new TypeError('network failure');
            return Response.json(state.response,{status:state.status});
        },
    };
    vm.runInNewContext(helper+'\nglobalThis.submit = submitEnquiry; globalThis.freezeFields = freezeFields;',context);
    return {state,submit:context.submit,freezeFields:context.freezeFields,form:{action:'/api/contact',append(){}}};
}
function data(message='Test message') {const d=new FormData();d.set('name','Test');d.set('email','test@example.com');d.set('message',message);return d;}
test('client uses a fresh token and stable submission id for unchanged uncertain retry',async()=>{
    const h=harness();h.state.failSend=true;
    await assert.rejects(h.submit(h.form,data()),/could not confirm/);
    h.state.failSend=false;await h.submit(h.form,data());
    assert.equal(h.state.sends[0].submission_id,h.state.sends[1].submission_id);
    assert.notEqual(h.state.sends[0]['cf-turnstile-response'],h.state.sends[1]['cf-turnstile-response']);
    assert.equal(h.state.removed,2);
});
test('successful new enquiry gets a new id',async()=>{const h=harness();await h.submit(h.form,data());await h.submit(h.form,data());assert.notEqual(h.state.sends[0].submission_id,h.state.sends[1].submission_id);});
test('changed content gets a new id after failure',async()=>{const h=harness();h.state.failSend=true;await assert.rejects(h.submit(h.form,data()));h.state.failSend=false;await h.submit(h.form,data('Changed'));assert.notEqual(h.state.sends[0].submission_id,h.state.sends[1].submission_id);});
test('failed/expired challenge blocks send, cleans up, and permits fresh retry',async()=>{const h=harness();h.state.failChallenge=true;await assert.rejects(h.submit(h.form,data()),/expired or failed/);assert.equal(h.state.sends.length,0);assert.equal(h.state.removed,1);h.state.failChallenge=false;await h.submit(h.form,data());assert.equal(h.state.sends.length,1);});
test('client displays server uncertainty instead of false did-not-send',async()=>{const h=harness();h.state.status=503;h.state.response={ok:false,message:'We could not confirm whether your request was sent.'};await assert.rejects(h.submit(h.form,data()),/could not confirm/);});
test('client rejects malformed success response',async()=>{const h=harness();h.state.response={};await assert.rejects(h.submit(h.form,data()),/could not confirm/);});

test('editable controls stay frozen during a pending submit and original disabled state survives',async()=>{
    const h=harness(); const editable={disabled:false}, disabled={disabled:true};
    const unlock=h.freezeFields({elements:[editable,disabled]});
    assert.equal(editable.disabled,true);assert.equal(disabled.disabled,true);
    await h.submit(h.form,data());
    assert.equal(editable.disabled,true);unlock();
    assert.equal(editable.disabled,false);assert.equal(disabled.disabled,true);
});
