// Post-build: take each area's Vite-emitted index.html and write it to the
// matching Frappe www/ template, injecting the Jinja boot block (the per-page
// `boot` dict is exposed on window.* for the SPA to read).
//
// One build emits agriflow/public/frontend/<area>/index.html; this maps each
// to its public route. Marketing (/about, /varieties, /contact) is aliased to
// home.html by website_route_rules in hooks.py.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, '..');
const BUILT = path.resolve(ROOT, '../agriflow/public/frontend');
const WWW   = path.resolve(ROOT, '../agriflow/www');

// area folder → www template filename
const ROUTES = {
  portal:           'portal.html',
  site:             'home.html',
  webshop:          'website-shop.html',
  'customer-panel': 'customer-portal.html',
  crm:              'crm.html',
};

const JINJA_BOOT = `
    <script>
      {% for key in boot %}
      window["{{ key }}"] = {{ boot[key] | tojson }};
      {% endfor %}
    </script>
`;

// Inline the area's emitted stylesheet into the HTML so styles are parsed with
// the document (no separate render-blocking request that can paint late).
async function inlineCss(html) {
  const linkRe = /<link rel="stylesheet"[^>]*href="(\/assets\/agriflow\/frontend\/assets\/[^"]+\.css)"[^>]*>/g;
  let out = html;
  for (const m of html.matchAll(linkRe)) {
    const rel = m[1].replace('/assets/agriflow/frontend/', '');
    try {
      const css = await readFile(path.resolve(BUILT, rel), 'utf8');
      out = out.replace(m[0], `<style>${css}</style>`);
    } catch {
      /* leave the link if the file can't be read */
    }
  }
  return out;
}

await mkdir(WWW, { recursive: true });

for (const [area, template] of Object.entries(ROUTES)) {
  const src = path.resolve(BUILT, area, 'index.html');
  let html = await readFile(src, 'utf8');
  if (!html.includes('</body>')) {
    console.error(`No </body> in ${src} — aborting.`);
    process.exit(1);
  }
  html = await inlineCss(html);
  const out = html.replace('</body>', JINJA_BOOT + '\n  </body>');
  const dest = path.resolve(WWW, template);
  await writeFile(dest, out, 'utf8');
  console.log(`✓ ${area} → www/${template}`);
}
