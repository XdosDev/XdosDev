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

    // --- Forms (Formspree, AJAX) ---
    const showMessage = (form, type, text) => {
        form.parentElement.querySelector('.form-message')?.remove();
        const div = document.createElement('div');
        div.className = `form-message ${type}`;
        div.setAttribute('role', 'status');
        div.textContent = text;
        form.after(div);
    };

    $$('.js-form').forEach(form => {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = $('button[type="submit"]', form);
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending…';
            try {
                const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
                if (!res.ok) throw new Error(String(res.status));
                const waitlist = form.querySelector('[name="enquiry_type"]')?.value === 'waitlist';
                showMessage(form, 'success', waitlist ? "You're on the list — we'll email you at launch." : "Thanks! We'll get back to you within one business day.");
                form.reset();
            } catch {
                showMessage(form, 'error', 'Something went wrong. Please try again, or email info@xdosdev.com.');
            } finally {
                btn.disabled = false;
                btn.textContent = label;
            }
        });
    });

    // --- Chat widget: name → email → message, sent via Formspree ---
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
        const send = $('.chat-send', chatForm);
        send.disabled = true;
        const data = new FormData();
        data.append('name', state.name);
        data.append('email', state.email);
        data.append('message', value);
        data.append('page', location.pathname);
        data.append('_subject', `Chat from ${state.name} via xdosdev.com`);
        try {
            const res = await fetch(chatForm.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(String(res.status));
            say(`Thanks! We'll reply to ${state.email} shortly. Anything else, just type it here.`);
        } catch {
            say('Sorry, that didn\'t send. Please email info@xdosdev.com instead.');
        } finally {
            send.disabled = false;
            input.focus();
        }
    });
})();
