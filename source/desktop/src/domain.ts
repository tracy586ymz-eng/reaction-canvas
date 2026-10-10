import { defaultSettings, emptyWorkspace, type Result, type Workspace, type Task } from './types';
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const short = (v: unknown, length: number) => typeof v === 'string' ? v.slice(0, length) : '';
export function parseResult(raw: string): Result {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const v: unknown = JSON.parse(text);
  if (!record(v) || !['reaction', 'answer', 'needs_input'].includes(String(v.kind)) || !['candidate', 'needs_conditions', 'needs_confirmation', 'unsupported', 'unknown'].includes(String(v.status)) || typeof v.conclusion !== 'string' || !Array.isArray(v.steps) || v.steps.length > 6) throw Error('模型结果格式不完整。输入已保留，请重试或更换模型。');
  const steps = v.steps.map(s => {
    if (!record(s) || !Array.isArray(s.reactants) || !Array.isArray(s.products) || s.reactants.length > 8 || s.products.length > 8) throw Error('反应步骤格式异常。');
    const molecules = (list: unknown[]) => list.map(m => {
      if (!record(m) || typeof m.smiles !== 'string' || m.smiles.length > 3000 || typeof m.label !== 'string') throw Error('分子结构数据不完整。');
      return { label: short(m.label, 80), smiles: m.smiles };
    });
    return { reactants: molecules(s.reactants), products: molecules(s.products), conditions: short(s.conditions, 160), source: s.source === 'transcribed' ? 'transcribed' as const : 'prediction' as const };
  });
  // Ambiguous structures never bypass confirmation by presenting definite products.
  if (v.status === 'needs_confirmation' && steps.some(s => s.products.length)) throw Error('模型在结构待确认时给出了确定产物，已停止展示。请修正结构或重试。');
  return { kind: v.kind as Result['kind'], status: v.status as Result['status'], conclusion: short(v.conclusion, 200), answer: short(v.answer, 6000), warnings: Array.isArray(v.warnings) ? v.warnings.filter(x => typeof x === 'string').slice(0, 8).map(x => short(x, 300)) : [], steps };
}
export function restoreWorkspace(raw: unknown): Workspace {
  if (raw === null || raw === undefined) return emptyWorkspace();
  if (!record(raw) || raw.version !== 1 || !Array.isArray(raw.tasks)) throw Error('历史格式不兼容，原文件已保留，停止自动覆盖。');
  if (raw.tasks.some(t => !record(t) || typeof t.id !== 'string' || typeof t.title !== 'string' || typeof t.draft !== 'string' || !Array.isArray(t.messages) || !Array.isArray(t.attachments) || t.messages.some(m => !record(m) || !['user','assistant'].includes(String(m.role)) || typeof m.text !== 'string' || !Array.isArray(m.images)))) throw Error('历史任务数据异常，原文件已保留，停止自动覆盖。');
  const attachmentValid=(a:unknown)=>record(a)&&typeof a.id==='string'&&typeof a.name==='string'&&typeof a.data==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(a.data);
  if(raw.tasks.some(t=>!t.attachments.every(attachmentValid)||t.messages.some((m:Record<string,unknown>)=>!(m.images as unknown[]).every(attachmentValid))))throw Error('历史附件格式异常，原文件已保留。');
  if(new Set(raw.tasks.map(t=>t.id)).size!==raw.tasks.length)throw Error('历史任务标识重复，原文件已保留。');
  const tasks = raw.tasks.filter(t => record(t) && typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.messages) && Array.isArray(t.attachments)).map(t => {
    const task = t as unknown as Task;
    return { ...task, messages:task.messages.map(m=>m.result?{...m,result:parseResult(JSON.stringify(m.result))}:m), busy: undefined, error: task.busy ? '上次分析在退出时中断，输入和历史已保留，可重试。' : task.error };
  });
  return { version: 1, tasks, selected: typeof raw.selected === 'string' && tasks.some(t => t.id === raw.selected) ? raw.selected : tasks[0]?.id ?? null, settings: { ...defaultSettings, ...(record(raw.settings) ? raw.settings : {}) } };
}
export function acceptResult(task: Task, revision: number, requestId: string): boolean { return task.revision === revision && task.busy === requestId; }
export function offlineSample(): Result {
  return { kind: 'reaction', status: 'needs_conditions', conclusion: '乙酸与乙醇有酯化路径', answer: '这是内置的确定结构示例，用于体验绘图与导出，没有分析当前截图。实际反应需要适当催化与平衡控制。', warnings: ['内置示例，不代表当前输入的实验可行性；未提供完整实验条件。'], steps: [{ reactants: [{ label: '乙酸', smiles: 'CC(=O)O' }, { label: '乙醇', smiles: 'CCO' }], products: [{ label: '乙酸乙酯', smiles: 'CC(=O)OCC' }, { label: '水', smiles: 'O' }], conditions: '酸催化 · 适当条件', source: 'prediction' }] };
}
