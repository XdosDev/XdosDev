import { categories, solutions } from './solutions.mjs';

export const SITE = {
    url: 'https://xdosdev.com',
    name: 'XdosDev',
    email: 'info@xdosdev.com',
    phoneUs: '+1 (346) 800-2550',
    phoneUsHref: 'tel:+13468002550',
    whatsapp: '+234 703 399 4933',
    whatsappHref: 'https://wa.me/2347033994933',
    address: '5900 Balcones Drive STE 100, Austin, TX 78731',
    formspree: 'https://formspree.io/f/xzzaypvb',
    // Cloudflare Web Analytics site token (dash → Analytics & Logs → Web Analytics). Leave empty to disable.
    analyticsToken: 'aa4e742c8e964b4c950da55eb6491230',
    year: new Date().getFullYear(),
};

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isExternal = href => /^https?:/.test(href);
const linkAttrs = href => (isExternal(href) ? ' target="_blank" rel="noopener"' : '');

// ---------- Icons ----------
const ICONS = {
    ledger: '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 002 1.6h7.6a2 2 0 002-1.5L21 8H6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6"/>',
    health: '<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z"/><path d="M12 9v5M9.5 11.5h5"/>',
    building: '<path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/>',
    check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/>',
    chat: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 00.5-9 6 6 0 00-11.6 1.5A4 4 0 007 19h10.5z"/>',
    tick: '<path d="M5 12l5 5 9-10"/>',
};
export const icon = (name, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const dot = s => `<span class="product-dot" style="--dot:${s.color}" aria-hidden="true">${s.mark}</span>`;
const statusBadge = s => (s.status === 'live' ? '<span class="badge badge--live">Live</span>' : '<span class="badge badge--soon">Coming soon</span>');

// ---------- Layout ----------
function head({ title, description, path, image = '/img/og-image.jpg', jsonLd }) {
    const canonical = SITE.url + path;
    return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="XdosDev">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE.url}${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#0b1020">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/styles.css">
    <script>document.documentElement.classList.remove('no-js')</script>
${jsonLd ? `    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}${SITE.analyticsToken ? `    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${SITE.analyticsToken}"}'></script>\n` : ''}</head>`;
}

function nav({ dark = false, current = '' }) {
    const items = solutions
        .map(s => `<a class="nav-dropdown-item" href="/solutions/${s.slug}/">${dot(s)}<div><strong>${esc(s.name)}</strong><span>${esc(s.kicker)}${s.status === 'soon' ? ' · coming soon' : ''}</span></div></a>`)
        .join('');
    const cur = key => (current === key ? ' aria-current="page"' : '');
    return `<a class="skip-link" href="#main">Skip to content</a>
<nav class="navbar${dark ? ' navbar--dark' : ''}" aria-label="Main">
    <div class="nav-container">
        <a href="/" class="nav-logo" aria-label="XdosDev home"><span class="nav-logo-mark">X</span>XdosDev</a>
        <ul class="nav-menu" id="navMenu">
            <li class="nav-dropdown">
                <button class="nav-link" type="button" aria-expanded="false" aria-controls="solutionsPanel"${cur('solutions')}>Solutions <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
                <div class="nav-dropdown-panel" id="solutionsPanel">${items}<a class="nav-dropdown-all" href="/solutions/">View all solutions →</a></div>
            </li>
            <li><a href="/#services" class="nav-link">Custom development</a></li>
            <li><a href="/#work" class="nav-link">Client work</a></li>
            <li><a href="/#about" class="nav-link">About</a></li>
            <li class="nav-cta"><a href="/#contact" class="btn btn-ghost btn-sm">Talk to us</a></li>
        </ul>
        <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="navMenu">
            <span class="toggle-line"></span><span class="toggle-line"></span><span class="toggle-line"></span>
        </button>
    </div>
</nav>`;
}

function footer() {
    const col = (title, links) => `<div class="footer-col"><h4>${title}</h4>${links.map(([t, h]) => `<a href="${h}"${linkAttrs(h)}>${esc(t)}</a>`).join('')}</div>`;
    return `<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <a href="/" class="nav-logo"><span class="nav-logo-mark">X</span>XdosDev</a>
                <p>Software products and custom engineering for businesses, schools and institutions in the US, UK and Africa.</p>
                <div class="footer-socials">
                    <a href="https://github.com/rapidmax01" target="_blank" rel="noopener" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>
                    <a href="https://linkedin.com/company/xdosdev" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                    <a href="https://x.com/xdosdev" target="_blank" rel="noopener" aria-label="XdosDev on X"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                </div>
            </div>
            ${col('Business', solutions.filter(s => s.category === 'business').map(s => [s.name, `/solutions/${s.slug}/`]))}
            ${col('Education', solutions.filter(s => s.category === 'education').map(s => [s.name, `/solutions/${s.slug}/`]))}
            ${col('Company', [
                ...solutions.filter(s => s.category === 'finance').map(s => [s.name, `/solutions/${s.slug}/`]),
                ['Custom development', '/#services'],
                ['Client work', '/#work'],
                ['Contact', '/#contact'],
            ])}
        </div>
        <div class="footer-bottom">
            <p>&copy; 2019–${SITE.year} XdosDev. Xdosdev LLC (Texas, USA) · Xdosdev Digital (Nigeria).</p>
            <p><a href="/privacy/" style="color:inherit">Privacy</a> · <a href="mailto:${SITE.email}" style="color:inherit">${SITE.email}</a></p>
        </div>
    </div>
</footer>
<button class="scroll-top" type="button" aria-label="Scroll to top">&uarr;</button>
<div class="chat-widget">
    <div class="chat-window" role="dialog" aria-label="Chat with XdosDev">
        <div class="chat-header">
            <div class="chat-avatar" aria-hidden="true">X</div>
            <div><div class="chat-header-name">XdosDev</div><div class="chat-header-status"><span class="chat-status-dot"></span> We typically reply within a few hours</div></div>
        </div>
        <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
        <form class="chat-form" id="chatForm" action="${SITE.formspree}" method="POST"><div class="chat-input-row"><input class="chat-input" id="chatInput" autocomplete="off" aria-label="Your reply"><button type="submit" class="chat-send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div></form>
    </div>
    <button class="chat-bubble" type="button" aria-label="Open chat" aria-expanded="false">
        <svg class="chat-icon-open" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <svg class="chat-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
</div>
<script src="/script.js" defer></script>
</body>
</html>`;
}

const page = ({ dark, current, body, ...meta }) => `${head(meta)}
<body>
${nav({ dark, current })}
<main id="main">
${body}
</main>
${footer()}`;

// ---------- Shared pieces ----------
function solutionCard(s) {
    const thumb = s.image
        ? `<div class="solution-thumb${s.image.phone ? ' solution-thumb--phone' : ''}"><img src="${s.image.src}" alt="${esc(s.image.alt)}" loading="lazy" width="1440" height="900"></div>`
        : `<div class="solution-thumb">${placeholderArt(s)}</div>`;
    return `<a class="solution-card reveal" href="/solutions/${s.slug}/" style="--accent:${s.color}">
    ${thumb}
    <div class="solution-body">
        <div class="solution-meta">${dot(s)}<div><span class="solution-kicker">${esc(s.kicker)}</span><h3 class="h3">${esc(s.name)}</h3></div></div>
        <p>${esc(s.summary)}</p>
        <ul class="solution-points">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="solution-foot"><span>Explore ${esc(s.name)} <span class="arrow">→</span></span>${statusBadge(s)}</div>
    </div>
</a>`;
}

// Abstract chart illustration for products without a public screenshot yet.
function placeholderArt(s) {
    return `<svg viewBox="0 0 400 250" width="100%" height="100%" role="img" aria-label="${esc(s.name)} illustration" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="250" fill="${s.color}" opacity="0.06"/>
    <g stroke="${s.color}" stroke-opacity="0.12">${[50, 100, 150, 200].map(y => `<line x1="0" x2="400" y1="${y}" y2="${y}"/>`).join('')}</g>
    <path d="M0 190 L40 175 L80 182 L120 150 L160 158 L200 120 L240 128 L280 96 L320 104 L360 70 L400 62 L400 250 L0 250Z" fill="${s.color}" opacity="0.12"/>
    <path d="M0 190 L40 175 L80 182 L120 150 L160 158 L200 120 L240 128 L280 96 L320 104 L360 70 L400 62" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="280" cy="96" r="6" fill="#fff" stroke="${s.color}" stroke-width="3"/>
    <rect x="24" y="24" width="120" height="44" rx="10" fill="#fff" stroke="${s.color}" stroke-opacity="0.2"/>
    <rect x="38" y="36" width="50" height="7" rx="3.5" fill="${s.color}" opacity="0.35"/><rect x="38" y="50" width="80" height="9" rx="4.5" fill="${s.color}" opacity="0.7"/>
</svg>`;
}

function enquiryForm({ product = '', kind = 'demo', button = 'Send message', compact = false }) {
    const subject = product ? `${kind === 'waitlist' ? 'Waitlist' : 'Enquiry'}: ${product}` : 'New enquiry from xdosdev.com';
    return `<form class="js-form" action="${SITE.formspree}" method="POST">
    <input type="hidden" name="_subject" value="${esc(subject)}">
    ${product ? `<input type="hidden" name="product" value="${esc(product)}">` : ''}
    <input type="hidden" name="enquiry_type" value="${kind}">
    <input type="text" name="_gotcha" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="form-row">
        <div class="form-group"><label for="f-name-${kind}">Name</label><input id="f-name-${kind}" name="name" required autocomplete="name"></div>
        <div class="form-group"><label for="f-email-${kind}">Email</label><input id="f-email-${kind}" type="email" name="email" required autocomplete="email"></div>
    </div>
    ${kind === 'waitlist' ? '' : `<div class="form-row">
        <div class="form-group"><label for="f-org-${kind}">Organisation</label><input id="f-org-${kind}" name="organisation" autocomplete="organization"></div>
        <div class="form-group"><label for="f-phone-${kind}">Phone / WhatsApp</label><input id="f-phone-${kind}" name="phone" autocomplete="tel"></div>
    </div>`}
    ${product ? '' : `<div class="form-group"><label for="f-interest">I'm interested in</label><select id="f-interest" name="interest">
        ${solutions.map(s => `<option>${esc(s.name)}</option>`).join('')}
        <option selected>A custom project</option><option>Something else</option>
    </select></div>`}
    ${kind === 'waitlist' ? '' : `<div class="form-group"><label for="f-msg-${kind}">${product ? 'What would you like to see?' : 'Tell us about your project'}</label><textarea id="f-msg-${kind}" name="message" rows="${compact ? 3 : 5}" ${product ? '' : 'required'}></textarea></div>`}
    <button type="submit" class="btn btn-primary btn-block">${esc(button)}</button>
    <p class="form-note">We reply within one business day. See how we handle your details in our <a href="/privacy/">privacy notice</a>.</p>
</form>`;
}

// ---------- Home ----------
export function homePage() {
    const live = solutions.filter(s => s.status === 'live');
    const groups = categories
        .map(c => {
            const items = solutions.filter(s => s.category === c.id);
            return `<div class="solution-group">
        <div class="solution-group-head"><h3>${c.name}</h3><p>${c.blurb}</p></div>
        <div class="solutions-grid${items.length === 1 ? ' solutions-grid--single' : ''}">${items.map(solutionCard).join('')}</div>
    </div>`;
        })
        .join('');

    const services = [
        ['code', 'Web platforms', 'Customer portals, marketplaces and SaaS products built to be run, not just launched.', ['React', 'Next.js', 'Node.js', 'FastAPI']],
        ['phone', 'Mobile apps', 'iOS and Android apps from a single codebase, with the backend and admin tools they need.', ['React Native', 'Expo', 'Flutter']],
        ['ledger', 'Payments & fintech', 'Subscriptions, wallets, payouts and reconciliation across African and global rails.', ['Paystack', 'Stripe', 'Flutterwave']],
        ['spark', 'AI features', 'Tutors, assistants, document extraction and summaries — grounded in your own data.', ['Claude', 'RAG', 'Automation']],
        ['cloud', 'Cloud & DevOps', 'Deployment, monitoring, backups and security hardening for production systems.', ['Fly.io', 'Cloudflare', 'Docker', 'PostgreSQL']],
        ['building', 'Tailored editions', 'Need JADICOQ or StudyMate adapted for your institution? We customise, migrate and train.', ['Customisation', 'Migration', 'Training']],
    ];

    const work = [
        ['Medtech Consults & Diagnostics', 'Patient portal and hospital system running on JADICOQ', 'https://medtechconsults.com/', '/img/medtechconsults.webp'],
        ['InuezTech', 'IT services company website', 'https://www.inueztech.com', '/img/inueztech.webp'],
        ['Farryn Cortes Photography', 'Photography portfolio', 'https://rapidmax01.github.io/farryncortesphotography/', '/img/farryncortes.webp'],
    ];

    const body = `
<section class="hero">
    <div class="container hero-inner">
        <div>
            <div class="hero-badge"><span class="pulse"></span> ${live.length} products live · US, UK &amp; Africa</div>
            <h1 class="h1">Software that runs <span class="gradient-text">businesses, schools and universities.</span></h1>
            <p class="lead">XdosDev builds and operates ready-to-use platforms — an ERP, school and university management systems, and AI learning tools — and engineers custom software when off-the-shelf won't do.</p>
            <div class="hero-actions">
                <a href="/solutions/" class="btn btn-light">Explore solutions <span class="arrow">→</span></a>
                <a href="#contact" class="btn btn-outline-light">Start a custom project</a>
            </div>
        </div>
        <div class="hero-stack" aria-label="Our products">
            ${solutions.map(s => `<a class="hero-product" href="/solutions/${s.slug}/">${dot(s)}<div class="hero-product-text"><strong>${esc(s.name)}${s.status === 'soon' ? ' <small style="opacity:.6;font-weight:500">· soon</small>' : ''}</strong><span>${esc(s.kicker)} — ${esc(s.tagline)}</span></div><span class="arrow">→</span></a>`).join('')}
        </div>
    </div>
</section>

<div class="facts">
    <div class="container facts-grid">
        <div class="fact"><span class="fact-value">${solutions.length}</span><span class="fact-label">Products we own &amp; run</span></div>
        <div class="fact"><span class="fact-value">3</span><span class="fact-label">Markets: US, UK, Africa</span></div>
        <div class="fact"><span class="fact-value">2019</span><span class="fact-label">Building software since</span></div>
        <div class="fact"><span class="fact-value">2</span><span class="fact-label">Registered entities: USA &amp; Nigeria</span></div>
    </div>
</div>

<section id="solutions" class="section">
    <div class="container">
        <div class="section-header">
            <span class="eyebrow">Solutions</span>
            <h2 class="h2">Ready-made platforms you can start using today</h2>
            <p class="lead">Each product is built, hosted and supported by our team. Sign up yourself, or let us set it up, migrate your data and train your staff.</p>
        </div>
        ${groups}
    </div>
</section>

<section id="services" class="section section-dark">
    <div class="container">
        <div class="section-header">
            <span class="eyebrow">Custom development</span>
            <h2 class="h2">When you need something built for you</h2>
            <p class="lead">The same team and infrastructure behind our products, applied to your idea.</p>
        </div>
        <div class="services-grid">
            ${services.map(([ic, t, d, tags]) => `<div class="service reveal"><div class="service-icon">${icon(ic, 22)}</div><h3>${t}</h3><p>${d}</p><div class="service-tags">${tags.map(x => `<span class="tag">${x}</span>`).join('')}</div></div>`).join('')}
        </div>
    </div>
</section>

<section class="section section-soft">
    <div class="container">
        <div class="section-header">
            <span class="eyebrow">How we work</span>
            <h2 class="h2">From first call to live system</h2>
        </div>
        <div class="process">
            <div class="process-step reveal"><h3>Discover</h3><p>We learn how you work today and decide together whether an existing product fits or a custom build is needed.</p></div>
            <div class="process-step reveal"><h3>Configure or build</h3><p>We set up your platform, or design and build in short cycles you can see and test.</p></div>
            <div class="process-step reveal"><h3>Migrate &amp; train</h3><p>We move your existing records across and train your staff until they're comfortable.</p></div>
            <div class="process-step reveal"><h3>Run &amp; support</h3><p>We host, monitor, back up and keep improving the system after launch.</p></div>
        </div>
    </div>
</section>

<section id="work" class="section">
    <div class="container">
        <div class="section-header">
            <span class="eyebrow">Client work</span>
            <h2 class="h2">Built for our clients</h2>
            <p class="lead">A selection of websites and platforms we've delivered.</p>
        </div>
        <div class="work-grid">
            ${work.map(([n, d, h, img]) => `<a class="work-card reveal" href="${h}" target="_blank" rel="noopener"><img src="${img}" alt="${esc(n)} website" loading="lazy" width="1280" height="800"><div><strong>${esc(n)} <span class="arrow" style="display:inline">↗</span></strong><span>${esc(d)}</span></div></a>`).join('')}
        </div>
    </div>
</section>

<section id="about" class="section section-soft">
    <div class="container about-grid">
        <div class="about-copy">
            <span class="eyebrow">About</span>
            <h2 class="h2" style="margin-bottom:24px">A product company with an engineering team you can hire</h2>
            <p>XdosDev started in 2019 building websites and apps for clients. Along the way we kept seeing the same problems — businesses juggling disconnected tools, schools running on paper and spreadsheets, universities without a single place for results — so we built products to solve them.</p>
            <p>Today we run those products for customers in the US, UK and Africa, and we still take on custom projects where our experience in payments, education, healthcare and AI makes a difference.</p>
            <div class="stack-list">${['React', 'Next.js', 'TypeScript', 'React Native', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL', 'Prisma', 'Docker', 'Fly.io', 'Cloudflare'].map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
        <div class="locations">
            <div class="location reveal"><div class="location-flag" aria-hidden="true">🇺🇸</div><div><h3>Xdosdev LLC — United States</h3><p>Registered in Texas<br>5900 Balcones Drive STE 100, Austin, TX 78731<br><a href="${SITE.phoneUsHref}">${SITE.phoneUs}</a></p></div></div>
            <div class="location reveal"><div class="location-flag" aria-hidden="true">🇳🇬</div><div><h3>Xdosdev Digital — Nigeria</h3><p>Registered with CAC · Lagos<br><a href="${SITE.whatsappHref}" target="_blank" rel="noopener">${SITE.whatsapp} (WhatsApp)</a></p></div></div>
        </div>
    </div>
</section>

<section id="contact" class="section section-dark">
    <div class="container contact-grid">
        <div>
            <span class="eyebrow">Contact</span>
            <h2 class="h2">Tell us what you need</h2>
            <p class="lead" style="margin-top:16px">A demo of one of our products, a quote for a custom build, or just a question — we reply within one business day.</p>
            <div class="contact-methods">
                <div class="contact-method"><h4>Email</h4><a href="mailto:${SITE.email}">${SITE.email}</a></div>
                <div class="contact-method"><h4>Phone (US)</h4><a href="${SITE.phoneUsHref}">${SITE.phoneUs}</a></div>
                <div class="contact-method"><h4>WhatsApp (Nigeria)</h4><a href="${SITE.whatsappHref}" target="_blank" rel="noopener">${SITE.whatsapp}</a></div>
            </div>
        </div>
        <div class="form-card">${enquiryForm({ kind: 'contact', button: 'Send message' })}</div>
    </div>
</section>`;

    return page({
        title: 'XdosDev — ERP, School & University Management Software and Custom Development',
        description: 'XdosDev builds and runs JADICOQ ERP, StudyMate Schools, Studymate UMS and LearnBee, and engineers custom web, mobile and AI software. Offices in Austin, TX and Lagos.',
        path: '/',
        dark: true,
        body,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'XdosDev',
            url: SITE.url,
            email: SITE.email,
            telephone: '+1-346-800-2550',
            address: { '@type': 'PostalAddress', streetAddress: '5900 Balcones Drive STE 100', addressLocality: 'Austin', addressRegion: 'TX', postalCode: '78731', addressCountry: 'US' },
            sameAs: ['https://github.com/rapidmax01', 'https://linkedin.com/company/xdosdev', 'https://x.com/xdosdev'],
        },
    });
}

// ---------- Solutions index ----------
export function solutionsIndexPage() {
    const body = `
<section class="page-hero">
    <div class="container-narrow">
        <span class="eyebrow">Solutions</span>
        <h1 class="h1">Products built and run by XdosDev</h1>
        <p class="lead">Business management, education and consumer fintech — each one hosted, supported and continuously improved by our team.</p>
    </div>
</section>
<section class="section" style="padding-top:24px">
    <div class="container">
        ${categories.map(c => `<div class="solution-group"><div class="solution-group-head"><h2 class="h3">${c.name}</h2><p>${c.blurb}</p></div>${(items => `<div class="solutions-grid${items.length === 1 ? ' solutions-grid--single' : ''}">${items.map(solutionCard).join('')}</div>`)(solutions.filter(s => s.category === c.id))}</div>`).join('')}
    </div>
</section>
${ctaBand({ color: '#3b5bfd', title: 'Not sure which fits?', text: 'Tell us how you work today and we\'ll recommend the right product — or scope a custom build.', form: enquiryForm({ kind: 'general', button: 'Get a recommendation', compact: true }) })}`;
    return page({
        title: 'Solutions — XdosDev',
        description: 'JADICOQ ERP, StudyMate Schools, Studymate UMS, LearnBee, NaijaXch and Rosca — software products built and run by XdosDev.',
        path: '/solutions/',
        current: 'solutions',
        body,
    });
}

function ctaBand({ color, title, text, form }) {
    return `<section class="section" id="enquire" style="--accent:${color}">
    <div class="container">
        <div class="cta-band">
            <div><h2 class="h2">${esc(title)}</h2><p class="lead">${esc(text)}</p></div>
            <div class="form-card">${form}</div>
        </div>
    </div>
</section>`;
}

function customerStory(s) {
    const c = s.customer;
    return `<section class="section" style="--accent:${s.color}">
    <div class="container">
        <div class="section-header"><span class="eyebrow">In production</span><h2 class="h2">Who runs on ${esc(s.name)}</h2></div>
        <div class="customer reveal">
            <a class="customer-shot" href="${c.url}" target="_blank" rel="noopener"><div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>${esc(c.url.replace(/^https?:\/\/|\/$/g, ''))}</span></div><img src="${c.image.src}" alt="${esc(c.image.alt)}" loading="lazy" width="1440" height="900"></div></a>
            <div class="customer-body">
                <span class="badge">${esc(c.sector)}</span>
                <h3>${esc(c.name)}</h3>
                <p class="customer-loc">${esc(c.location)}</p>
                <p class="customer-text">${esc(c.text)}</p>
                <div class="service-tags">${c.modules.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>
                <a class="btn btn-ghost btn-sm" href="${c.url}" target="_blank" rel="noopener">Visit ${esc(c.url.replace(/^https?:\/\/|\/$/g, ''))} <span class="arrow">↗</span></a>
            </div>
        </div>
    </div>
</section>`;
}

// ---------- Solution detail ----------
export function solutionPage(s) {
    const cta = s.cta;
    const btn = (b, cls) => (b ? `<a href="${b.href}" class="btn ${cls}"${linkAttrs(b.href)}>${esc(b.label)}${cls.includes('accent') ? ' <span class="arrow">→</span>' : ''}</a>` : '');
    const visual = s.image
        ? s.image.phone
            ? `<div class="phone-frame"><img src="${s.image.src}" alt="${esc(s.image.alt)}" width="700" height="1521"></div>`
            : `<div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>${esc(s.image.url)}</span></div><img src="${s.image.src}" alt="${esc(s.image.alt)}" width="1440" height="900"></div>`
        : `<div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>${esc(s.name)} — preview</span></div><div style="aspect-ratio:16/10">${placeholderArt(s)}</div></div>`;
    const enquiry = s.enquiry || {
        title: `See ${s.name} in action`,
        text: `Book a walkthrough with our team. We'll show you how ${s.name} fits the way you work, and answer questions about setup, migration and pricing.`,
        button: 'Request a demo',
        kind: 'demo',
    };
    const related = solutions.filter(o => o.slug !== s.slug && (o.category === s.category || o.status === 'live')).slice(0, 3);

    const body = `
<section class="sol-hero" style="--accent:${s.color}">
    <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/solutions/">Solutions</a><span aria-hidden="true">/</span><span aria-current="page">${esc(s.name)}</span></nav>
        <div class="sol-hero-grid">
            <div>
                <div class="sol-brand">${dot(s)}<strong>${esc(s.name)}</strong><span class="badge">${esc(s.kicker)}</span>${statusBadge(s)}</div>
                <h1 class="h1" style="font-size:clamp(2.2rem,4.6vw,3.5rem)">${esc(s.tagline)}</h1>
                <p class="lead">${esc(s.summary)}</p>
                <div class="hero-actions">${btn(cta.primary, 'btn-accent')}${btn(cta.secondary, 'btn-ghost')}</div>
                <ul class="sol-checks">${s.heroChecks.map(c => `<li>${icon('tick', 16)}${esc(c)}</li>`).join('')}</ul>
            </div>
            <div class="reveal">${visual}</div>
        </div>
    </div>
</section>

<section class="section section-soft" style="--accent:${s.color}">
    <div class="container">
        <div class="section-header"><span class="eyebrow">Who it's for</span><h2 class="h2">Built for the people who use it every day</h2></div>
        <div class="audience-grid">${s.audiences.map(a => `<div class="audience reveal"><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div>`).join('')}</div>
    </div>
</section>

<section class="section" style="--accent:${s.color}">
    <div class="container">
        <div class="section-header"><span class="eyebrow">${s.status === 'live' ? 'What\'s inside' : 'What\'s coming'}</span><h2 class="h2">${s.status === 'live' ? 'Everything in one platform' : 'Built for launch'}</h2></div>
        <div class="module-grid">${s.modules.map(m => `<div class="module reveal"><div class="module-head"><div class="module-icon">${icon(m.icon)}</div><h3>${esc(m.title)}</h3></div><ul>${m.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>
        ${cta.pricing ? `<p class="plans-note" style="margin-top:32px"><a href="${cta.pricing}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600;text-decoration:none">See current plans &amp; pricing on ${esc(s.site.replace(/^https?:\/\/(www\.)?/, ''))} <span class="arrow" style="display:inline-block">→</span></a></p>` : ''}
    </div>
</section>

<section class="section section-dark" style="--accent:${s.color}">
    <div class="container split">
        <div><span class="eyebrow">Why ${esc(s.name)}</span><h2 class="h2">${s.highlights.length > 2 ? 'Designed for how you actually work' : 'What makes it different'}</h2></div>
        <div class="highlight-list">${s.highlights.map(h => `<div class="highlight reveal">${icon('tick', 20)}<div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div></div>`).join('')}</div>
    </div>
</section>

${s.customer ? customerStory(s) : ''}
<section class="section section-soft">
    <div class="container-narrow">
        <div class="section-header"><span class="eyebrow" style="color:${s.color}">FAQ</span><h2 class="h2">Common questions</h2></div>
        <div class="faq">${s.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
    </div>
</section>

${ctaBand({ color: s.color, title: enquiry.title, text: enquiry.text, form: enquiryForm({ product: s.name, kind: enquiry.kind, button: enquiry.button, compact: true }) })}

<section class="section" style="padding-top:0">
    <div class="container">
        <div class="section-header section-header--left" style="margin-bottom:24px"><h2 class="h3">More from XdosDev</h2></div>
        <div class="related-grid">${related.map(o => `<a class="related" href="/solutions/${o.slug}/">${dot(o)}<div><strong>${esc(o.name)}</strong><span>${esc(o.kicker)}</span></div></a>`).join('')}</div>
    </div>
</section>`;

    return page({
        title: `${s.name} — ${s.kicker} | XdosDev`,
        description: `${s.tagline} ${s.summary}`.slice(0, 300),
        path: `/solutions/${s.slug}/`,
        current: 'solutions',
        body,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': s.slug === 'rosca' ? 'MobileApplication' : 'SoftwareApplication',
            name: s.name,
            description: s.summary,
            applicationCategory: s.category === 'education' ? 'EducationalApplication' : s.category === 'finance' ? 'FinanceApplication' : 'BusinessApplication',
            ...(s.site ? { url: s.site } : {}),
            publisher: { '@type': 'Organization', name: 'XdosDev', url: SITE.url },
        },
    });
}

export function notFoundPage() {
    return page({
        title: 'Page not found — XdosDev',
        description: 'The page you were looking for could not be found.',
        path: '/404',
        body: `<section class="page-hero" style="min-height:70vh;display:grid;place-items:center"><div class="container-narrow"><span class="eyebrow">404</span><h1 class="h1">This page doesn't exist</h1><p class="lead">It may have moved when we rebuilt the site.</p><div class="hero-actions" style="justify-content:center"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-ghost" href="/solutions/">Browse solutions</a></div></div></section>`,
    });
}

export function privacyPage() {
    const updated = '13 September 2026';
    const section = (title, html) => `<h2 class="h3" style="margin:40px 0 12px">${title}</h2>${html}`;
    const body = `
<section class="page-hero" style="text-align:left;padding-bottom:24px">
    <div class="container-narrow">
        <span class="eyebrow">Legal</span>
        <h1 class="h1" style="font-size:clamp(2rem,4vw,3rem)">Privacy notice</h1>
        <p class="lead" style="margin-left:0">How XdosDev handles personal information collected through xdosdev.com. Last updated ${updated}.</p>
    </div>
</section>
<section class="section prose" style="padding-top:16px">
    <div class="container-narrow">
        ${section('Who we are', `<p>This website is operated by Xdosdev LLC (Texas, USA) and Xdosdev Digital (registered with the Corporate Affairs Commission, Nigeria), together "XdosDev", "we" or "us". For any privacy question, email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
        <p>This notice covers this marketing website only. Each of our products — such as JADICOQ ERP, StudyMate Schools, Studymate UMS and LearnBee — has its own privacy notice on its own website, which applies when you use that product.</p>`)}
        ${section('What we collect', `<ul>
            <li><strong>Enquiry, demo and waitlist forms:</strong> your name, email address and, if you choose to give them, your organisation, phone/WhatsApp number and message, plus the product you asked about.</li>
            <li><strong>Chat widget:</strong> your name, email address, message and the page you sent it from.</li>
            <li><strong>Technical data:</strong> like any website, our hosting provider processes your IP address and browser details to deliver pages and protect the site from abuse.</li>
        </ul>
        <p>We do not use advertising or tracking cookies, and we do not sell your information.</p>`)}
        ${section('Why we use it', `<p>We use what you send us only to reply to your enquiry, arrange a demo, notify you when a product you joined the waitlist for launches, and keep a record of our conversation. Our lawful basis is your consent when you submit a form, and our legitimate interest in responding to business enquiries.</p>`)}
        ${section('Who processes it for us', `<ul>
            <li><strong>Formspree</strong> receives form and chat submissions and forwards them to our inbox.</li>
            <li><strong>Google (Gmail)</strong> hosts the inbox where we receive and answer enquiries.</li>
            <li><strong>Cloudflare</strong> hosts and secures this website${SITE.analyticsToken ? ' and provides privacy-friendly, cookie-free visitor statistics' : ''}.</li>
        </ul>
        <p>These providers may process data in the United States and other countries. Where information leaves the UK, EEA or Nigeria, we rely on the providers' standard contractual safeguards.</p>`)}
        ${section('How long we keep it', `<p>We keep enquiry records for up to 24 months after our last contact with you, unless you become a customer (in which case the relevant product agreement applies) or ask us to delete them sooner. Waitlist entries are deleted once the product launches and we have notified you, or when you unsubscribe.</p>`)}
        ${section('Your rights', `<p>Depending on where you live — including under the UK GDPR, the EU GDPR and the Nigeria Data Protection Act 2023 — you can ask us to access, correct or delete your information, object to or restrict how we use it, or withdraw your consent at any time. Email <a href="mailto:${SITE.email}">${SITE.email}</a> and we will respond within one month.</p>
        <p>If you are unhappy with how we have handled your information, you can complain to your local regulator — for example the Information Commissioner's Office (UK) or the Nigeria Data Protection Commission.</p>`)}
        ${section('Changes', `<p>We will update this page if our practices change, and revise the date at the top.</p>`)}
    </div>
</section>`;
    return page({
        title: 'Privacy notice — XdosDev',
        description: 'How XdosDev collects, uses and protects personal information submitted through xdosdev.com.',
        path: '/privacy/',
        body,
    });
}
