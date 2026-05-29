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
};

const JINJA_BOOT = `
    <script>
      {% for key in boot %}
      window["{{ key }}"] = {{ boot[key] | tojson }};
      {% endfor %}
    </script>
`;

await mkdir(WWW, { recursive: true });

for (const [area, template] of Object.entries(ROUTES)) {
  const src = path.resolve(BUILT, area, 'index.html');
  const html = await readFile(src, 'utf8');
  if (!html.includes('</body>')) {
    console.error(`No </body> in ${src} — aborting.`);
    process.exit(1);
  }
  const out = html.replace('</body>', JINJA_BOOT + '\n  </body>');
  const dest = path.resolve(WWW, template);
  await writeFile(dest, out, 'utf8');
  console.log(`✓ ${area} → www/${template}`);
}
