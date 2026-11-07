# XdosDev website

Marketing site for XdosDev: the products we build and run, plus custom development services.

## Structure

```
src/
  solutions.mjs     Product catalogue — edit this to change any solution card or page
  templates.mjs     Page templates (home, /solutions/, /solutions/<slug>/, 404) and site config
  assets/           styles.css, script.js
img/opt/            Optimised WebP images used by the site
build.mjs           Renders everything into public/
public/             Build output deployed by wrangler — everything in it is public
```

Pages generated: `/`, `/solutions/`, one page per product in `src/solutions.mjs`, `/404.html`, `sitemap.xml`, `robots.txt`.

## Adding or editing a solution

Edit the entry in `src/solutions.mjs` (`status: 'live' | 'soon'`). A primary CTA `href` beginning with `#` scrolls to the page's enquiry form; forms submit to `/api/contact` with the product name attached. The Worker sends enquiry notifications through Brevo.

## Build & deploy

```bash
node build.mjs                                   # writes public/
cd public && python3 -m http.server 8787         # preview at http://localhost:8787
# Release is upload-only staging, followed by explicit promotion.
# Follow docs/brevo-setup.md; never use ordinary deploy/secret-put to stage.
```

The static build and Worker tests have no npm dependencies. Use Node 22+ for the test suite and a current Wrangler version for Worker development.

The internal Marketing Engine (`marketing/`) is not part of this site. Run it with `node marketing/server.js`, which checks the password on the server; never copy it into `public/`.

## Interactive homepage

The homepage layout is in `src/homepage.html`; its isolated styles and progressive
interactions are in `src/assets/homepage.css` and `src/assets/homepage.js`.
The shared navigation, forms, chat, metadata, privacy notice and product pages
continue to use the existing templates and assets. Homepage product links lead to
the existing solution detail pages. The idea builder only prepares an email draft.

The silent hero film and poster are self-hosted in `src/assets/home/`. The film is
lazy-loaded when visible; reduced-motion and data-saving users see the poster
until they choose Play. No Three.js runtime is needed. Contact, demo, waitlist and chat notifications use the server-side Brevo integration. See [Brevo setup and release checklist](docs/brevo-setup.md) before deploying: sending is deliberately disabled until the sender and secret are configured.

Validation:

```bash
node build.mjs
python3 tests/static.py
node --check src/assets/homepage.js
node --check worker/contact.mjs
node --test tests/contact.mjs tests/contact-config.mjs tests/contact-client.mjs
python3 tests/budget.py
# Optional browser regression suite (Playwright must be available):
# Serve public/ on 127.0.0.1:8787, then:
CHROMIUM_PATH=/usr/bin/chromium node tests/contact-browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/homepage.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/film-controls.cjs
```

The browser suite mocks Turnstile and intercepts `/api/contact` requests; it never sends a real enquiry.
Review at desktop and mobile widths, including reduced motion and the direct-email
fallback when JavaScript is disabled, before release. Turnstile requires JavaScript.
Preparation and enabled-release checks are separate: use
`node scripts/check-contact-config.mjs --prepare` while disabled and `--release`
after the reviewed configuration is complete. Neither check verifies live credentials.

Release note: `main`, not the repository's default `master`, contains the current
multi-page production source. The Brevo integration baseline is `8d9c6c7`; the
existing interactive homepage and mobile film-control fix are retained. Deploy only the
reviewed Worker and `public/` build together after explicit production approval. No deployment is
performed by this feature branch. Existing `wrangler.jsonc` targets the live
custom domains, so do not run `wrangler deploy` just to preview this change.
