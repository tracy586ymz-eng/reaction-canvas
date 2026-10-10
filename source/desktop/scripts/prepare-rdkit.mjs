import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const pkg = JSON.parse(await readFile('node_modules/@rdkit/rdkit/package.json', 'utf8'));
if (pkg.version !== '2026.03.6') throw Error('Review CSP adapter before upgrading RDKit');
const source = await readFile('node_modules/@rdkit/rdkit/dist/RDKit_minimal.js', 'utf8');
const [first, second] = (await readFile('scripts/rdkit-csp-invokers.js', 'utf8')).split('// RC_EMVAL_STATIC_ADAPTER');
let patched = source;
function replaceFactory(start, end, replacement) {
  const a = patched.indexOf(start), b = patched.indexOf(end, a);
  if (a < 0 || b <= a) throw Error('RDKit wrapper changed; manual review required');
  patched = patched.slice(0, a) + replacement + patched.slice(b);
}
replaceFactory('function createJsInvoker(', 'function craftInvokerFunction(', first);
replaceFactory('var __emval_create_invoker=function(', 'function __emval_get_global(', second);
if (/new Function\s*\(|\beval\s*\(/.test(patched)) throw Error('Dynamic JavaScript compilation remains');
await mkdir('public/rdkit', { recursive: true });
await writeFile('public/rdkit/RDKit_minimal.csp.js', patched);
await copyFile('node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm', 'public/rdkit/RDKit_minimal.wasm');
await writeFile('public/rdkit/BUILD.json', JSON.stringify({ version: pkg.version, upstreamSha256: createHash('sha256').update(source).digest('hex'), patchedSha256: createHash('sha256').update(patched).digest('hex'), adaptation: 'Static Embind invokers; no new Function/eval; WASM unchanged', license: pkg.license }, null, 2));
console.log('Prepared pinned RDKit with static CSP-safe bindings');
