// XdosDev — site script

(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    // --- Navigation ---
    const navbar = $('.navbar');
    const toggle = $('.nav-toggle');
    const menu = $('#navMenu');
    const dropdown = $('.nav-dropdown');
    const dropdownBtn = dropdown && $('button', dropdown);

    const closeMenu = () => {
        menu.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        document.body.style.overflow = '';
    };

    toggle?.addEventListener('click', () => {
        const open = menu.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = open ? 'hidden' : '';
    });

    dropdownBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const open = dropdown.classList.toggle('open');
        dropdownBtn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', e => {
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            dropdownBtn.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        dropdown?.classList.remove('open');
        dropdownBtn?.setAttribute('aria-expanded', 'false');
        if (menu?.classList.contains('active')) closeMenu();
        $('.chat-widget')?.classList.remove('open');
    });

    $$('#navMenu a').forEach(a => a.addEventListener('click', () => menu.classList.contains('active') && closeMenu()));

    // --- Scroll state ---
    const scrollTop = $('.scroll-top');
    const onScroll = () => {
        const y = window.scrollY;
        navbar?.classList.toggle('scrolled', y > 24);
        scrollTop?.classList.toggle('visible', y > 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    scrollTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- Reveal on scroll ---
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        $$('.reveal').forEach(el => io.observe(el));
    } else {
        $$('.reveal').forEach(el => el.classList.add('visible'));
    }

    // --- Forms (same-origin email endpoint, AJAX) ---
    const showMessage = (form, type, text) => {
        form.parentElement.querySelector('.form-message')?.remove();
        const div = document.createElement('div');
        div.className = `form-message ${type}`;
        div.setAttribute('role', 'status');
        div.textContent = text;
        form.after(div);
    };

    // Load spam protection only when a visitor tries to submit. Each attempt
    // obtains a fresh single-use token, including after an error or expiry.
    let protection;
    const pendingSubmissions = new WeakMap();
    const publicError = message => Object.assign(new Error(message), { publicMessage: message });
    const loadProtection = () => {
        if (protection) return protection;
        protection = (async () => {
            const res = await fetch('/api/contact-config', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
            const config = await res.json();
            if (!res.ok || !config.enabled || !config.siteKey) throw publicError('The form is temporarily unavailable. Please email info@xdosdev.com.');
            if (!window.turnstile) await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                const timer = setTimeout(() => { script.remove(); reject(publicError('Spam protection could not load. Please try again later or email info@xdosdev.com.')); }, 15000);
                script.onload = () => { clearTimeout(timer); resolve(); };
                script.onerror = () => { clearTimeout(timer); script.remove(); reject(publicError('Spam protection could not load. Please try again later or email info@xdosdev.com.')); };
                document.head.append(script);
            });
            return { api: window.turnstile, siteKey: config.siteKey };
        })().catch(error => { protection = null; throw error; });
        return protection;
    };
    const verifyVisitor = async form => {
        let api, siteKey;
        try { ({ api, siteKey } = await loadProtection()); }
        catch (error) { throw publicError(error.publicMessage || 'Spam protection is unavailable. Your request was not sent. Please try again later.'); }
        const container = document.createElement('div');
        container.className = 'form-verification';
        form.append(container);
        let widgetId, timer;
        try {
            return await new Promise((resolve, reject) => {
                const fail = () => reject(publicError('The spam-protection check expired or failed. Your request was not sent. Please try again.'));
                timer = setTimeout(fail, 120000);
                widgetId = api.render(container, {
                    sitekey: siteKey, action: 'contact', size: 'compact',
                    execution: 'execute', appearance: 'interaction-only', 'response-field': false,
                    callback: resolve, 'error-callback': fail, 'expired-callback': fail, 'timeout-callback': fail,
                });
                api.execute(widgetId);
            });
        } finally {
            clearTimeout(timer);
            if (widgetId !== undefined) api.remove(widgetId);
            container.remove();
        }
    };
    const freezeFields = form => {
        const fields = [...form.elements].filter(field => !field.disabled);
        fields.forEach(field => { field.disabled = true; });
        return () => fields.forEach(field => { field.disabled = false; });
    };
    const submitEnquiry = async (form, data) => {
        const signature = JSON.stringify([...data]);
        let submission = pendingSubmissions.get(form);
        if (!submission || submission.signature !== signature) {
            submission = { signature, id: crypto.randomUUID() };
            pendingSubmissions.set(form, submission);
        }
        data.set('submission_id', submission.id);
        data.set('cf-turnstile-response', await verifyVisitor(form));
        let res;
        try {
            res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
        } catch {
            throw publicError('We could not confirm whether your request was sent. Please wait before retrying to avoid a duplicate, or email info@xdosdev.com.');
        }
        const result = await res.json().catch(() => null);
        if (!res.ok || result?.ok !== true) {
            throw publicError(result?.message || (res.status === 429 ? 'Please wait a minute before trying again.' : 'We could not confirm whether your request was sent. Please wait before retrying, or email info@xdosdev.com.'));
        }
        pendingSubmissions.delete(form);
    };

    $$('.js-form').forEach(form => {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = $('button[type="submit"]', form);
            if (btn.disabled) return;
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending…';
            const data = new FormData(form);
            const unfreeze = freezeFields(form);
            try {
                await submitEnquiry(form, data);
                const waitlist = form.querySelector('[name="enquiry_type"]')?.value === 'waitlist';
                showMessage(form, 'success', waitlist ? "Thanks! Your waitlist request has been sent." : "Thanks! We'll get back to you within one business day.");
                form.reset();
            } catch (error) {
                showMessage(form, 'error', error.publicMessage || 'The form is unavailable. Please email info@xdosdev.com.');
            } finally {
                unfreeze();
                btn.disabled = false;
                btn.textContent = label;
            }
        });
    });

    // --- Chat widget: name → email → message, sent via the same-origin email endpoint ---
    const widget = $('.chat-widget');
    if (!widget) return;
    const bubble = $('.chat-bubble', widget);
    const messages = $('#chatMessages');
    const chatForm = $('#chatForm');
    const input = $('#chatInput');
    const state = { step: 'name', name: '', email: '' };

    const say = (text, who = 'bot') => {
        const row = document.createElement('div');
        row.className = `chat-msg chat-msg--${who}`;
        const b = document.createElement('div');
        b.className = 'chat-msg-bubble';
        b.textContent = text;
        row.append(b);
        messages.append(row);
        messages.scrollTop = messages.scrollHeight;
    };

    const setStep = step => {
        state.step = step;
        input.type = step === 'email' ? 'email' : 'text';
        input.maxLength = { name: 100, email: 254, message: 5000 }[step];
        input.placeholder = { name: 'Your name', email: 'you@company.com', message: 'Type your message…' }[step];
        input.focus();
    };

    let started = false;
    const open = isOpen => {
        widget.classList.toggle('open', isOpen);
        bubble.setAttribute('aria-expanded', String(isOpen));
        bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
        if (isOpen && !started) {
            started = true;
            const product = document.querySelector('.sol-brand strong')?.textContent;
            say(product ? `Hi! Questions about ${product}? We're happy to help.` : 'Hi! Looking for one of our products, or planning a custom project?');
            say("What's your name?");
            setStep('name');
        } else if (isOpen) {
            input.focus();
        }
    };

    bubble.addEventListener('click', e => {
        e.stopPropagation();
        open(!widget.classList.contains('open'));
    });
    document.addEventListener('click', e => {
        if (widget.classList.contains('open') && !widget.contains(e.target)) open(false);
    });

    chatForm.addEventListener('submit', async e => {
        e.preventDefault();
        const send = $('.chat-send', chatForm);
        if (send.disabled) return;
        const value = input.value.trim();
        if (!value) return;

        if (state.step === 'name') {
            state.name = value;
            say(value, 'user');
            input.value = '';
            say(`Nice to meet you, ${value}. What email should we reply to?`);
            return setStep('email');
        }
        if (state.step === 'email') {
            if (!input.checkValidity()) return say('That email doesn\'t look quite right — could you check it?');
            state.email = value;
            say(value, 'user');
            input.value = '';
            say('Great. How can we help?');
            return setStep('message');
        }

        say(value, 'user');
        input.value = '';
        send.disabled = true;
        input.disabled = true;
        const data = new FormData();
        data.append('name', state.name);
        data.append('email', state.email);
        data.append('message', value);
        data.append('page', location.pathname);
        data.append('enquiry_type', 'chat');
        data.append('_gotcha', chatForm.querySelector('[name="_gotcha"]').value);
        try {
            await submitEnquiry(chatForm, data);
            say(`Thanks! We'll reply to ${state.email} shortly. Anything else, just type it here.`);
        } catch (error) {
            input.value = value;
            say(`${error.publicMessage || 'The form is unavailable. Please email info@xdosdev.com.'} Your message is restored below.`);
        } finally {
            send.disabled = false;
            input.disabled = false;
            input.focus();
        }
    });
})();
