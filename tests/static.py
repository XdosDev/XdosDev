"""Run `node build.mjs && python3 tests/static.py`. No dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re
root=Path(__file__).resolve().parents[1]/'public'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  for key in ['src','href','poster','data-src']:
   if key in a:self.refs.append(a[key])
count=0
for f in root.rglob('*.html'):
 p=Page();p.feed(f.read_text());assert len(p.ids)==len(set(p.ids)),f'Duplicate ID in {f}'
 for ref in p.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=(root/u.path.lstrip('/')) if u.path.startswith('/') else (f.parent/u.path if u.path else f)
  if target.is_dir():target=target/'index.html'
  assert target.exists(),f'Missing {ref} in {f}'
  if u.fragment and target.suffix=='.html':
   q=Page();q.feed(target.read_text());assert u.fragment in q.ids,f'Missing fragment {ref} in {f}'
 count+=1
home=(root/'index.html').read_text()
for forbidden in ['PRIVATE DESIGN CONCEPT','Editorial placeholder','Case study content to add','Nothing is submitted','live website is unchanged']:
 assert forbidden not in home,forbidden
assert home.count('<h1')==1
assert 'action="/api/contact"' in home and '/privacy/' in home
assert 'application/ld+json' in home and 'static.cloudflareinsights.com' in home
print(f'PASS {count} pages: local links, assets, fragments, unique IDs; homepage metadata and production copy')

assert 'Historical records may remain' in (root/'privacy/index.html').read_text()
assert 'Turnstile' in (root/'privacy/index.html').read_text()
assert 'Brevo' in (root/'privacy/index.html').read_text()
for f in root.rglob('*'):
 if f.is_file() and f.suffix in ['.html','.js','.json']:
  assert 'BREVO_API_KEY' not in f.read_text(), f'Server-only configuration exposed in {f}'

assert 'Zoho Mail' in (root/'privacy/index.html').read_text()
