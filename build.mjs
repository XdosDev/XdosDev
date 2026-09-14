// Static site build: renders src/ templates into public/ (the directory wrangler deploys).
// Usage: node build.mjs
// Only files this script owns are written; anything else placed in public/ is deployed too, so keep it clean.

import { mkdir, writeFile, readFile, copyFile, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { solutions } from './src/solutions.mjs';
import { SITE, homePage, solutionsIndexPage, solutionPage, notFoundPage, privacyPage } from './src/templates.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'public');

async function emit(path, content) {
    const file = join(out, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
    console.log('  ' + path);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b5bfd"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect rx="22" width="100" height="100" fill="url(#g)"/><text x="50" y="69" font-size="58" font-weight="800" font-family="system-ui,sans-serif" text-anchor="middle" fill="#fff">X</text></svg>`;

console.log('Building site → public/');

// Pages
await emit('index.html', homePage());
await emit('solutions/index.html', solutionsIndexPage());
for (const s of solutions) await emit(`solutions/${s.slug}/index.html`, solutionPage(s));
await emit('privacy/index.html', privacyPage());
await emit('404.html', notFoundPage());

// Assets
await emit('favicon.svg', favicon);
await emit('styles.css', (await readFile(join(root, 'src/assets/fonts.css'), 'utf8')) + '\n' + (await readFile(join(root, 'src/assets/styles.css'), 'utf8')));
await mkdir(join(out, 'fonts'), { recursive: true });
for (const f of await readdir(join(root, 'src/assets/fonts'))) await copyFile(join(root, 'src/assets/fonts', f), join(out, 'fonts', f));
await copyFile(join(root, 'src/assets/script.js'), join(out, 'script.js'));

// Images: replace public/img with the optimised set
await rm(join(out, 'img'), { recursive: true, force: true });
await mkdir(join(out, 'img'), { recursive: true });
for (const f of await readdir(join(root, 'img/opt'))) await copyFile(join(root, 'img/opt', f), join(out, 'img', f));

// SEO
const urls = ['/', '/solutions/', ...solutions.map(s => `/solutions/${s.slug}/`), '/privacy/'];
await emit('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
await emit('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

console.log('Done.');
