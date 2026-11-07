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

Edit the entry in `src/solutions.mjs` (`status: 'live' | 'soon'`). A primary CTA `href` beginning with `#` scrolls to the page's enquiry form; forms submit to Formspree with the product name attached.

## Build & deploy

```bash
node build.mjs                                   # writes public/
cd public && python3 -m http.server 8787         # preview at http://localhost:8787
cd .. && wrangler deploy                         # Cloudflare Workers static assets (wrangler.jsonc)
```

No dependencies — Node 18+ is enough.

The internal Marketing Engine (`marketing/`) is not part of this site. Run it with `node marketing/server.js`, which checks the password on the server; never copy it into `public/`.

## Interactive homepage

The homepage layout is in `src/homepage.html`; its isolated styles and progressive
interactions are in `src/assets/homepage.css` and `src/assets/homepage.js`.
The shared navigation, forms, chat, metadata, privacy notice and product pages
continue to use the existing templates and assets. Homepage product links lead to
the existing solution detail pages. The idea builder only prepares an email draft.

The silent hero film and poster are self-hosted in `src/assets/home/`. The film is
lazy-loaded when visible; reduced-motion and data-saving users see the poster
until they choose Play. No Three.js runtime is needed. Contact submissions still
use the existing Formspree integration.

Validation:

```bash
node build.mjs
python3 tests/static.py
node --check src/assets/homepage.js
# Optional browser regression suite (Playwright must be available):
# Serve public/ on 127.0.0.1:8787, then:
CHROMIUM_PATH=/usr/bin/chromium node tests/homepage.cjs
```

The browser suite intercepts Formspree requests; it never sends a real enquiry.
Review at desktop and mobile widths, including reduced motion and JavaScript
disabled, before release.

Release note: `main`, not the repository's default `master`, contains the current
multi-page production source. The baseline for this change is `d65270a`; its
built homepage was verified byte-for-byte against xdosdev.com. Deploy only the
reviewed `public/` build after explicit production approval. No deployment is
performed by this feature branch. Existing `wrangler.jsonc` targets the live
custom domains, so do not run `wrangler deploy` just to preview this change.
