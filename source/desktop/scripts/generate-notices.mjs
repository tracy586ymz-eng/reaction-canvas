import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const platform=process.platform==='win32'?'x86_64-pc-windows-msvc':process.arch==='arm64'?'aarch64-apple-darwin':'x86_64-apple-darwin';
const metadata=JSON.parse(execFileSync('cargo',['metadata','--locked','--format-version','1','--filter-platform',platform],{cwd:'src-tauri',maxBuffer:20*1024*1024,encoding:'utf8'}));
const nodes=new Map(metadata.resolve.nodes.map(n=>[n.id,n]));const reached=new Set();
function walk(key){if(reached.has(key))return;reached.add(key);for(const dep of nodes.get(key)?.deps??[])walk(dep.pkg)}
walk(metadata.resolve.root);
await mkdir('licenses',{recursive:true});let lines=['# Third-party notices','', 'This app reuses open-source software. Its own distribution policy is separate from these component licenses.','', 'RDKit loader modification: static Embind invocation factories; original WASM unchanged. Source and version integrity are recorded by scripts/prepare-rdkit.mjs.',''];
for(const name of ['react','react-dom','scheduler','@tauri-apps/api','@rdkit/rdkit']){
 const dir=path.join('node_modules',name);const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));lines.push(`- ${name} ${pkg.version}: ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license)}`);
 const destination=path.join('licenses',name.replaceAll('/','-'));await mkdir(destination,{recursive:true});
 for(const file of await readdir(dir))if(/^license/i.test(file)&&!file.endsWith('.spdx'))await copyFile(path.join(dir,file),path.join(destination,file));
}
for(const pkg of metadata.packages.filter(p=>p.name!=='reaction-canvas'&&reached.has(p.id))){
 lines.push(`- Rust ${pkg.name} ${pkg.version}: ${pkg.license??'See upstream license'} · ${pkg.repository??'https://crates.io/crates/'+pkg.name}`);
 const dir=path.dirname(pkg.manifest_path);const destination=path.join('licenses',`${pkg.name}-${pkg.version}`);await mkdir(destination,{recursive:true});
 for(const file of await readdir(dir))if(/^(license|copying|copyright)/i.test(file)){try{await copyFile(path.join(dir,file),path.join(destination,file))}catch{/* Directory licenses are documented by upstream link. */}}
}
await writeFile('licenses/THIRD-PARTY-NOTICES.md',lines.join('\n')+'\n');console.log('Recorded component licenses without machine paths or secrets');
