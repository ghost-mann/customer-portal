import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, '..');
const BUILT = path.resolve(ROOT, '../agriflow/public/webshop/index.html');
const OUT   = path.resolve(ROOT, '../agriflow/www/website-shop.html');

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
await writeFile(OUT, out, 'utf8');
console.log(`✓ Wrote ${OUT}`);
