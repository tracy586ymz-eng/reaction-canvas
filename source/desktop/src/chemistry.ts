import type { Result } from './types';
let modulePromise: Promise<any> | undefined;
async function rdkit() {
  if (!modulePromise) modulePromise = new Promise<void>((resolve, reject) => {
    if (window.initRDKitModule) return resolve();
    const script = document.createElement('script'); script.src = new URL('rdkit/RDKit_minimal.csp.js', document.baseURI).href; script.onload = () => resolve(); script.onerror = () => reject(Error('本机绘图模块加载失败，请重新启动。')); document.head.append(script);
  }).then(() => window.initRDKitModule!({ locateFile: () => new URL('rdkit/RDKit_minimal.wasm', document.baseURI).href })).catch(e => { modulePromise = undefined; throw e; });
  return modulePromise;
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
function safeSvg(raw: string) {
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw Error('绘图模块生成了无效图形。');
  doc.querySelectorAll('script,foreignObject,image,a').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => Array.from(el.attributes).forEach(a => { if (a.name.startsWith('on') || /(?:href|src)$/i.test(a.name)) el.removeAttribute(a.name); }));
  const svg = doc.documentElement; svg.setAttribute('width', '210'); svg.setAttribute('height', '150');
  return new XMLSerializer().serializeToString(svg);
}
export interface Drawing { svg: string; warnings: string[]; width: number; height: number }
export async function drawResult(result: Result, sample = false, compact = false): Promise<Drawing> {
  const kit = await rdkit(); const rows: string[] = []; const warnings: string[] = [];
  let canvasWidth = 1000;
  for (const [index, step] of result.steps.entries()) {
    const all = [...step.reactants, ...step.products];
    if (!step.reactants.length || !step.products.length) { warnings.push(`步骤 ${index + 1} 的参与物不完整，暂不绘制。`); continue; }
    const drawings: string[] = [];
    for (const molecule of all) {
      let mol;
      try {
        mol = kit.get_mol(molecule.smiles);
        if (!mol || !mol.is_valid()) throw Error('invalid');
        drawings.push(safeSvg(mol.get_svg(210, 150)));
      } catch { throw Error(`步骤 ${index + 1} 的“${molecule.label || '分子'}”未通过结构校验，已停止显示反应图。请修正输入或重试。`); }
      finally { mol?.delete(); }
    }
    if (compact) {
      const bodies: string[] = []; const cell = 158; const rowHeight = 90;
      function grid(start: number, count: number, top: number) {
        for (let j=0;j<count;j++) { const x=16+(j%2)*cell; const y=top+Math.floor(j/2)*rowHeight; const n=start+j; bodies.push(`<g transform="translate(${x+22},${y}) scale(.50)">${drawings[n]}</g><text x="${x+74}" y="${y+83}" text-anchor="middle" font-size="13">${esc(all[n].label.slice(0,11))}</text>`); if(j%2===1) bodies.push(`<text x="171" y="${y+42}" text-anchor="middle" font-size="17">+</text>`); }
      }
      const firstHeight=Math.ceil(step.reactants.length/2)*rowHeight;
      grid(0,step.reactants.length,35); const arrowY=35+firstHeight;
      bodies.push(`<path d="M175 ${arrowY+3}v24m-7-9 7 9 7-9" fill="none" stroke="#245b9e" stroke-width="2.5"/><text x="175" y="${arrowY+44}" text-anchor="middle" font-size="12">${esc(step.conditions.slice(0,24))}</text>`);
      grid(step.reactants.length,step.products.length,arrowY+52);
      const height=arrowY+52+Math.ceil(step.products.length/2)*rowHeight+26;
      return { width:350,height,warnings,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${height}" viewBox="0 0 350 ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,PingFang SC,Microsoft YaHei,sans-serif" fill="#202734"><text x="16" y="14" font-size="11">${sample?'内置示例 · 非当前截图分析':'初步结果 · 核对结构与条件'}</text><text x="16" y="29" font-size="11">结构转化示意 · 未验证完整配平</text>${bodies.join('')}<text x="16" y="${height-9}" font-size="11">反应候选不等于实验成功；完整说明随导出保留。</text></g></svg>` };
    }
    const width = Math.max(1000, all.length * 235 + 190); canvasWidth = Math.max(canvasWidth, width);
    let x = 24; const body: string[] = [];
    for (let j = 0; j < all.length; j++) {
      if (j === step.reactants.length) {
        body.push(`<path d="M${x+5} 94h125m-20-9 20 9-20 9" fill="none" stroke="#245b9e" stroke-width="2.5"/><text x="${x+68}" y="64" text-anchor="middle" font-size="13">${esc(step.conditions.slice(0, 20))}</text>`); x += 170;
      } else if (j > 0) { body.push(`<text x="${x-13}" y="100" font-size="23">+</text>`); }
      body.push(`<g transform="translate(${x},20)">${drawings[j]}</g><text x="${x+105}" y="190" text-anchor="middle" font-size="14">${esc(all[j].label)}</text>`); x += 235;
    }
    rows.push(`<g transform="translate(0,${80+index*260})"><text x="24" y="5" font-size="13">步骤 ${index+1} · ${step.source==='transcribed'?'文献转写（待核对）':'预测路径'}</text>${body.join('')}<text x="24" y="219" font-size="12">条件：${esc(step.conditions.slice(0,80))}</text><text x="24" y="237" font-size="12">${esc(step.conditions.slice(80))}</text></g>`);
  }
  if (!rows.length) return { svg: '', warnings, width: 0, height: 0 };
  const notes=(result.warnings.length?result.warnings:['反应候选不等于实验成功；需核对条件。']).flatMap(s=>s.match(/.{1,100}/gu)??[]);
  const noteTop=95+result.steps.length*260;const height=noteTop+notes.length*18+20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${height}" viewBox="0 0 ${canvasWidth} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,PingFang SC,Microsoft YaHei,sans-serif" fill="#202734"><text x="24" y="29" font-size="18">${esc(result.conclusion.slice(0,100))}</text><text x="24" y="53" font-size="12">${sample?'内置示例 · 非当前截图分析':'初步预测/转写 · 需核对结构与条件'} · 结构转化示意（未验证完整配平）</text>${rows.join('')}${notes.map((n,i)=>`<text x="24" y="${noteTop+i*18}" font-size="12">${esc(n)}</text>`).join('')}</g></svg>`;
  return { svg, warnings, width: canvasWidth, height };
}
export async function pngFromSvg(drawing: Drawing): Promise<string> {
  const url = URL.createObjectURL(new Blob([drawing.svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); const scale = Math.min(2, 4000 / drawing.width);
    canvas.width = Math.round(drawing.width * scale); canvas.height = Math.round(drawing.height * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw Error('无法生成图片。'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
