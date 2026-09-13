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
public/             Build output deployed by wrangler (public/marketing is separate and untouched)
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
