// Post-build: copy the Vite-emitted index.html to TWO Frappe www routes
// (home.html and one shared template that website_route_rules can alias to)
// with the Jinja boot block injected.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, '..');
const BUILT = path.resolve(ROOT, '../agriflow/public/site/index.html');

// All public marketing routes share the same React SPA shell. We write one
// canonical file (home.html) and Frappe website_route_rules in hooks.py alias
// /about, /varieties, /contact to it.
const TARGETS = [
  '../agriflow/www/home.html',
];

const JINJA_BOOT = `
    <script>
      {% for key in boot %}
      window["{{ key }}"] = {{ boot[key] | tojson }};
      {% endfor %}
    </script>
`;

const html = await readFile(BUILT, 'utf8');
if (!html.includes('</body>')) {
  console.error('No </body> in built index.html — aborting copy.');
  process.exit(1);
}
const out = html.replace('</body>', JINJA_BOOT + '\n  </body>');

for (const t of TARGETS) {
  const dest = path.resolve(ROOT, t);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, out, 'utf8');
  console.log(`✓ Wrote ${dest}`);
}
