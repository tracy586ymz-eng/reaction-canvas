import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { call, on, isNative } from './bridge';
import { acceptResult, offlineSample, parseResult, restoreWorkspace } from './domain';
import { drawResult, pngFromSvg, type Drawing } from './chemistry';
import { defaultSettings, emptyWorkspace, type Attachment, type Message, type Result, type Settings, type Task, type Workspace } from './types';
import './style.css';

const id = () => crypto.randomUUID();
const friendly = (e: unknown) => e instanceof Error ? e.message : String(e);
const statusLabel: Record<Result['status'], string> = { candidate: '候选路径', needs_conditions: '条件待补充', needs_confirmation: '结构待确认', unsupported: '当前条件未支持', unknown: '暂无法判断' };
function makeTask(): Task { return { id: id(), title: '新分析', created: Date.now(), revision: 0, messages: [], draft: '', attachments: [] }; }

function ResultView({ message, compact, notify }: { message: Message; compact: boolean; notify: (s: string) => void }) {
  const result = message.result!; const [drawing, setDrawing] = useState<Drawing>(); const [error, setError] = useState(''); const [working, setWorking] = useState(false); const [exportBusy, setExportBusy] = useState(false); const [stepIndex,setStepIndex]=useState(0);
  useEffect(() => {
    let live = true; setDrawing(undefined); setError('');
    if (result.steps.length) { setWorking(true); const visible=compact?{...result,steps:[result.steps[Math.min(stepIndex,result.steps.length-1)]]}:result; drawResult(visible, message.sample, compact).then(v => { if (live) setDrawing(v); }).catch(e => { if (live) setError(friendly(e)); }).finally(() => { if (live) setWorking(false); }); }
    return () => { live = false; };
  }, [message.id, result, compact, stepIndex]);
  async function exportDrawing(format: 'svg' | 'png', copy = false) {
    if (!drawing?.svg || exportBusy) return; setExportBusy(true);
    try {
      const fullDrawing = compact ? await drawResult(result, message.sample) : drawing;
      const content = format === 'svg' ? fullDrawing.svg : await pngFromSvg(fullDrawing);
      if (copy) { await call('copy_image', { data: content }); notify('图片已复制，可粘贴到文档。'); }
      else { if (await call<boolean>('export_file', { format, content })) notify('图已保存，预测与条件标识一并保留。'); }
    } catch (e) { notify(friendly(e)); } finally { setExportBusy(false); }
  }
  if(result.kind==='answer'&&!result.steps.length)return <article className="plain-answer"><h2>{result.conclusion}</h2>{result.answer&&<p className="answer">{result.answer}</p>}{result.warnings.map(w=><p className="warning" key={w}>{w}</p>)}</article>;
  return <section className="result" aria-label="分析结果">
    <div className="result-heading"><h2>{result.conclusion}</h2><span className="badge">{message.sample ? '内置示例' : '初步结果'}</span><span className="badge">{statusLabel[result.status]}</span></div>
    {working && <p role="status">正在用本机绘图模块整理结构…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {compact && result.steps.length>1 && <div className="actions"><button disabled={stepIndex===0} onClick={()=>setStepIndex(i=>i-1)}>上一步</button><span>步骤 {stepIndex+1} / {result.steps.length}</span><button disabled={stepIndex>=result.steps.length-1} onClick={()=>setStepIndex(i=>i+1)}>下一步</button></div>}
    {drawing?.svg && <div className={`figure ${compact ? 'compact' : ''}`}><img alt={`${result.conclusion}的结构转化示意，未验证完整配平`} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.svg)}`} /></div>}
    {compact && drawing?.svg && <p className="muted">长图可点“继续讨论”展开查看。</p>}
    {drawing?.warnings.map(w => <p key={w} className="warning">{w}</p>)}
    {(result.answer || result.warnings.length > 0 || result.steps.length > 0) && <details open={!result.steps.length || !!error}><summary>条件、说明与限制</summary>
      {result.answer && <p className="answer">{result.answer}</p>}
      {result.steps.map((s, i) => <p key={i}>步骤 {i + 1}：{s.conditions || '条件未给出'} · {s.source === 'transcribed' ? '文献转写，需核对' : '模型候选，需核对'}</p>)}
      {result.warnings.map(w => <p key={w} className="warning">{w}</p>)}
    </details>}
    {drawing?.svg && !error && <div className="actions"><button disabled={exportBusy} onClick={() => exportDrawing('png', true)}>复制图</button><button disabled={exportBusy} onClick={() => exportDrawing('svg')}>导出 SVG</button><button disabled={exportBusy} onClick={() => exportDrawing('png')}>导出 PNG</button></div>}
  </section>;
}

function SettingsDialog({ settings, hasKey, save, close, notify, backupNew, restoreHistory }: { settings: Settings; hasKey: boolean; save: (s: Settings, stored: boolean) => Promise<void>; close: () => void; notify: (s: string) => void; backupNew:()=>Promise<void>; restoreHistory:()=>Promise<void> }) {
  const [form, setForm] = useState({ ...settings }); const [key, setKey] = useState(''); const [stored, setStored] = useState(hasKey); const [models, setModels] = useState<string[]>([]); const [filter, setFilter] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { setStored(hasKey); }, [hasKey]);
  useEffect(() => { let active=true; setKey(''); setStored(false); call<boolean>('key_status',{baseUrl:form.baseUrl}).then(v=>{if(active)setStored(v)}).catch(()=>{}); return ()=>{active=false}; }, [form.baseUrl]);
  const field = <K extends keyof Settings>(name: K, value: Settings[K]) => setForm(s => ({ ...s, [name]: value, ...(['model', 'baseUrl'].includes(name) ? { freeConfirmed: false, vision: false } : {}), ...(name==='baseUrl'?{consent:false}:{}) }));
  const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(form.baseUrl);
  async function storeKey() { if (key.trim()) { await call('set_key', { key, baseUrl: form.baseUrl }); setStored(true); setKey(''); return true; } const exists=await call<boolean>('key_status',{baseUrl:form.baseUrl});setStored(exists);return exists; }
  async function connect() {
    setBusy(true); setMessage('正在获取可用模型…');
    try { await storeKey(); const list = await call<string[]>('list_models', { baseUrl: form.baseUrl }); setModels(list); setMessage(`连接成功，找到 ${list.length} 个模型。列表不代表免费或支持图片。`); }
    catch (e) { setMessage(friendly(e)); } finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setMessage('');
    try {
      const ok = await storeKey();
      if (!local && !ok) throw Error('请填写密钥，或选择本机兼容服务。');
      if (!form.model.trim()) throw Error('请选择或填写一个模型名称。');
      if (!form.consent) throw Error('请选择是否允许将选中的内容发送给此服务；不允许时可关闭设置并使用本机示例。');
      if (form.freeOnly && !form.freeConfirmed) throw Error('请先到服务平台确认所选模型当前免费。');
      await save({ ...form, model: form.model.trim(), baseUrl: form.baseUrl.trim().replace(/\/$/, '') }, ok); close(); notify('设置已保存。可以截图或发送图片了。');
    } catch (e) { setMessage(friendly(e)); } finally { setBusy(false); }
  }
  return <div className="backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) close(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <header><h2 id="settings-title">连接分析服务</h2><button aria-label="关闭设置" disabled={busy} onClick={close}>关闭</button></header>
    <p className="muted">只配置一次。密钥保存在系统凭据存储，日常截图不需要选模型。</p>
    <label>服务地址<input value={form.baseUrl} onChange={e => field('baseUrl', e.target.value)} placeholder="https://api.siliconflow.cn/v1" spellCheck={false} /></label>
    <div className="actions"><button onClick={() => setForm({ ...defaultSettings, shortcut:settings.shortcut })}>硅基流动</button><button onClick={() => setForm({ ...defaultSettings, baseUrl: 'http://127.0.0.1:11434/v1', shortcut:settings.shortcut, freeConfirmed:true })}>本机兼容服务</button></div>
    <label>API 密钥 {stored && <span className="muted">（已在系统中保存）</span>}<input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder={local ? '本机无认证服务可留空' : stored ? '留空保留现有密钥' : '粘贴自己的密钥'} /></label>
    <div className="actions"><button disabled={busy} onClick={connect}>连接并获取模型</button>{stored && <button disabled={busy} onClick={async () => { try { await call('remove_key',{baseUrl:form.baseUrl}); setStored(false); notify('当前服务的密钥已移除。'); } catch (e) { setMessage(friendly(e)); } }}>移除当前服务密钥</button>}</div>
    {!!models.length && <><label>查找模型<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="输入模型名的部分内容" /></label><select aria-label="可用模型" value={models.includes(form.model) ? form.model : ''} onChange={e => field('model', e.target.value)}><option value="">选择模型…</option>{models.filter(m => m.toLowerCase().includes(filter.toLowerCase())).slice(0, 200).map(m => <option key={m}>{m}</option>)}</select></>}
    <label>模型名称<input value={form.model} onChange={e => field('model', e.target.value)} placeholder="从列表选择，也可以填写完整模型名称" spellCheck={false} /></label>
    <label className="check"><input type="checkbox" checked={form.vision} onChange={e => field('vision', e.target.checked)} />我已确认这个模型支持图片输入</label>
    <label className="check"><input type="checkbox" checked={form.freeOnly} onChange={e => field('freeOnly', e.target.checked)} />只使用我确认免费的模型，不自动切换服务</label>
    {form.freeOnly ? <label className="check"><input type="checkbox" checked={form.freeConfirmed} onChange={e => field('freeConfirmed', e.target.checked)} />已在平台核对：当前所选模型免费（本机服务由我管理）</label> : <p className="warning">已允许调用当前所选模型，可能按供应商价格产生费用。不会自动切换其他模型。</p>}
    <p className="muted">可用模型列表没有价格保证，也不能凭 Pro 前缀判断免费；价格与视觉能力需要在平台核对。</p>
    <label className="check"><input type="checkbox" checked={form.consent} onChange={e => field('consent', e.target.checked)} />允许把我选中的图片、问题及本任务上下文发送给此服务</label>
    <label>截图快捷键<input value={form.shortcut} onChange={e => field('shortcut', e.target.value)} spellCheck={false} /></label>
    <p className="muted">默认 macOS：⌘⇧空格；Windows：Ctrl+Shift+Space。冲突时可更换，也可点击“截图分析”。</p>
    <details><summary>本机历史与恢复</summary><p className="muted">新建工作区前会完整备份原图与历史；恢复前也会备份当前内容。凭据不在备份中，恢复不会切换当前服务。</p><div className="actions"><button disabled={busy} onClick={async()=>{setBusy(true);try{await backupNew();close()}catch(e){setMessage(friendly(e))}finally{setBusy(false)}}}>备份并新建工作区</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await restoreHistory();close()}catch(e){setMessage(friendly(e))}finally{setBusy(false)}}}>恢复本机备份</button></div></details>
    {message && <p className="notice" role="status">{message}</p>}
    <footer><button disabled={busy} onClick={async () => { setBusy(true); try { await save({ ...form, consent: false }, stored); close(); notify('已关闭联网分析，历史、绘图和导出仍可使用。'); } catch(e) { setMessage(friendly(e)); } finally { setBusy(false); } }}>使用离线模式</button><button disabled={busy} onClick={close}>稍后设置</button><button className="primary" disabled={busy} onClick={submit}>{busy ? '处理中…' : '保存设置'}</button></footer>
  </section></div>;
}

function App() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace); const ref = useRef(workspace); const [ready, setReady] = useState(false); const [mode, setMode] = useState<'main' | 'panel'>('main'); const [settingsOpen, setSettingsOpen] = useState(false); const [hasKey, setHasKey] = useState(false); const [notice, setNotice] = useState(''); const [captureBusy, setCaptureBusy] = useState(false); const [pinned, setPinned] = useState(false); const [original, setOriginal] = useState<Attachment>(); const [showArchive, setShowArchive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null); const latestHandlers = useRef({ capture: () => {}, quit: () => {} }); const saveQueue = useRef(Promise.resolve()); const loadFailed = useRef(false); const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = workspace.tasks.find(t => t.id === workspace.selected); const compact = mode === 'panel';
  function notify(text: string) { setNotice(text); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 7000); }
  function update(fn: (w: Workspace) => Workspace) { const next = fn(ref.current); ref.current = next; setWorkspace(next); }
  function changeTask(taskId: string, fn: (t: Task) => Task) { update(w => ({ ...w, tasks: w.tasks.map(t => t.id === taskId ? fn(t) : t) })); }
  function ensureTask(): string {
    if (ref.current.selected && ref.current.tasks.some(t => t.id === ref.current.selected)) return ref.current.selected;
    const task = makeTask(); update(w => ({ ...w, selected: task.id, tasks: [task, ...w.tasks] })); return task.id;
  }
  function newTask() { const task = makeTask(); update(w => ({ ...w, selected: task.id, tasks: [task, ...w.tasks] })); return task.id; }
  function persist() {
    if (loadFailed.current) return Promise.reject(Error('历史读取异常，已停止覆盖原文件。'));
    const snapshot = ref.current;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => call<void>('save_workspace', { data: snapshot }));
    return saveQueue.current;
  }
  useEffect(() => {
    let disposed = false;
    Promise.allSettled([call('load_workspace')]).then(results => {
      if (disposed) return;
      if (results[0].status === 'fulfilled') { try { const w = restoreWorkspace(results[0].value); ref.current = w; setWorkspace(w); call<boolean>('key_status',{baseUrl:w.settings.baseUrl}).then(setHasKey).catch(e=>notify(friendly(e))); } catch(e) { loadFailed.current = true; notify(friendly(e)); } }
      else { loadFailed.current = true; notify(friendly(results[0].reason)); }
      setReady(true);
    });
    const cleanups: (() => void)[] = [];
    [on<void>('capture-request', () => latestHandlers.current.capture()), on<'main' | 'panel'>('view-mode', setMode), on<string>('shortcut-error', notify), on<void>('workspace-flush', () => { persist().catch(e => notify(friendly(e))); }), on<void>('quit-request', () => latestHandlers.current.quit())].forEach(p => p.then(f => disposed ? f() : cleanups.push(f)));
    return () => { disposed = true; cleanups.forEach(f => f()); };
  }, []);
  useEffect(() => { if (settingsOpen) call<boolean>('key_status',{baseUrl:ref.current.settings.baseUrl}).then(setHasKey).catch(e => notify(friendly(e))); }, [settingsOpen]);
  useEffect(() => { if (!ready || loadFailed.current) return; const timer = setTimeout(() => { persist().catch(e => notify(friendly(e))); }, 450); return () => clearTimeout(timer); }, [workspace, ready]);
  async function switchView(panel: boolean) { try { await call('show_view', { panel }); setMode(panel ? 'panel' : 'main'); if (!panel) setPinned(false); } catch (e) { notify(friendly(e)); } }
  function configured() { const s = ref.current.settings; return !!s.model && s.consent && (!s.freeOnly || s.freeConfirmed); }
  async function run(taskId: string, override?: { text: string; attachments: Attachment[] }, retry = false) {
    let task = ref.current.tasks.find(t => t.id === taskId); if (!task || task.busy) return;
    if (!configured()) { setSettingsOpen(true); notify('图片和问题已保留。先连接一个允许使用的模型，再点击发送。'); return; }
    const text = override?.text ?? task.draft; const attachments = override?.attachments ?? task.attachments;
    if (!retry && !text.trim() && !attachments.length) return;
    if (!ref.current.settings.vision && (attachments.length || task.messages.some(m => m.images.length))) { setSettingsOpen(true); notify('这个任务包含图片，请选择支持图片的模型。'); return; }
    const requestId = id(); const revision = task.revision + 1;
    const user: Message = { id: id(), role: 'user', text, images: attachments };
    const messages = retry ? task.messages : [...task.messages, user];
    if (messages.length > 28) { notify('该分析已有较长上下文，请新建分析。'); return; }
    if (messages.reduce((n,m) => n+m.images.length, 0) > 6) { notify('同一任务最多6张图片，请新建分析或减少附件。'); return; }
    changeTask(taskId, t => ({ ...t, title: t.messages.length ? t.title : (text.trim().slice(0, 22) || '截图分析'), messages, draft: retry ? t.draft : '', attachments: retry ? t.attachments : [], revision, error: '', busy: requestId }));
    try {
      const raw = await call<string>('analyze', { request: { id: requestId, settings: { ...ref.current.settings }, messages: messages.map(m => ({ role: m.role, text: m.role === 'assistant' && m.result ? JSON.stringify(m.result) : m.text, images: m.images.map(a => a.data) })) } });
      const result = parseResult(raw);
      const response: Message = { id: id(), role: 'assistant', text: raw, images: [], result };
      changeTask(taskId, t => acceptResult(t, revision, requestId) ? { ...t, messages: [...t.messages, response], busy: undefined, error: '' } : t);
    } catch (e) { changeTask(taskId, t => acceptResult(t, revision, requestId) ? { ...t, busy: undefined, error: friendly(e) } : t); }
  }
  async function stop(taskId: string) {
    const task = ref.current.tasks.find(t => t.id === taskId); if (!task?.busy) return;
    const requestId = task.busy; changeTask(taskId, t => ({ ...t, busy: undefined, revision: t.revision + 1, error: '已停止显示本次分析，输入已保留；服务端是否已完成由供应商决定。' }));
    await call('cancel_analysis', { id: requestId }).catch(e => notify(friendly(e)));
  }
  async function screenshot(append = false) {
    if (captureBusy || !ready) return; setCaptureBusy(true);
    try {
      const data = await call<string | null>('capture'); if (!data) return;
      const taskId = append ? ensureTask() : newTask(); const image = { id: id(), name: '截图', data };
      const task = ref.current.tasks.find(t => t.id === taskId)!;
      if (task.busy) { notify('当前分析仍在运行，截图已放入待发送附件。'); }
      changeTask(taskId, t => ({ ...t, attachments: [...t.attachments, image] })); setMode('panel');
      if (!task.busy) await run(taskId, { text: task.draft, attachments: [...task.attachments, image] });
    } catch (e) { notify(friendly(e)); } finally { setCaptureBusy(false); }
  }
  latestHandlers.current = { capture: () => { screenshot(); }, quit: () => { persist().then(() => call('exit_app')).catch(e => notify(`退出前保存失败：${friendly(e)}`)); } };
  async function attach(files: File[]) {
    const taskId = ensureTask(); const task = ref.current.tasks.find(t => t.id === taskId)!;
    const images = files.filter(f => ['image/png', 'image/jpeg', 'image/webp'].includes(f.type));
    if (images.length !== files.length) notify('首版支持 PNG、JPEG、WebP；PDF请截取需要的页面。');
    for (const file of images) {
      if (file.size > 12 * 1024 * 1024) { notify(`${file.name} 超过12 MB，请缩小图片。`); continue; }
      if ((ref.current.tasks.find(t => t.id === taskId)?.attachments.length ?? 0) + task.messages.reduce((n,m)=>n+m.images.length,0) >= 6) { notify('同一任务最多6张图片。'); break; }
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(Error('图片读取失败。')); reader.readAsDataURL(file); });
      changeTask(taskId, t => ({ ...t, attachments: [...t.attachments, { id: id(), name: file.name, data }] }));
    }
  }
  function sample() {
    const task = makeTask(); const result = offlineSample(); task.title = '乙酸与乙醇（内置示例）'; task.messages = [{ id: id(), role: 'user', text: '体验乙酸与乙醇的结构转化示意（内置示例）', images: [] }, { id: id(), role: 'assistant', text: JSON.stringify(result), images: [], result, sample: true }];
    update(w => ({ ...w, selected: task.id, tasks: [task, ...w.tasks] }));
  }
  async function saveSettings(settings: Settings, stored: boolean) { await call('set_shortcut', { shortcut: settings.shortcut }); update(w => ({ ...w, settings })); setHasKey(stored); await persist(); }
  function historyCanChange(){if(loadFailed.current)throw Error('原历史格式异常，已停止覆盖；请先保留原文件并处理。');if(ref.current.tasks.some(t=>t.busy))throw Error('请先停止运行中的分析，再备份或恢复历史。');}
  async function backupNew(){historyCanChange();await call('backup_workspace',{data:ref.current});update(w=>({...w,tasks:[],selected:null}));await persist();notify('原图与历史已在本机完整备份，新工作区已建立。');}
  async function restoreHistory(){historyCanChange();const raw=await call<unknown>('choose_workspace_backup');if(raw===null)return;const restored=restoreWorkspace(raw);await call('backup_workspace',{data:ref.current});update(w=>({...w,tasks:restored.tasks,selected:restored.selected}));await persist();notify('历史已恢复，当前服务设置保持不变。');}
  function composer() {
    const taskId = selected?.id;
    return <div className="composer">
      {!!selected?.attachments.length && <div className="attachments">{selected.attachments.map((a,i) => <div className="attachment" key={a.id}><button className="thumbnail" onClick={() => setOriginal(a)}><img src={a.data} alt={`待发送图片${i+1}`} /></button><span>{String.fromCharCode(65+i)} · {a.name}</span><div className="actions"><button aria-label={`移除图片${i+1}`} onClick={() => changeTask(selected.id, t => ({ ...t, attachments: t.attachments.filter(x => x.id !== a.id) }))}>移除</button>{i > 0 && <button onClick={() => changeTask(selected.id, t => { const attachments = [...t.attachments]; [attachments[i-1],attachments[i]] = [attachments[i],attachments[i-1]]; return { ...t, attachments }; })}>前移</button>}</div></div>)}</div>}
      <textarea aria-label="输入问题" placeholder={compact ? '继续问这张图，或补充条件…' : '描述问题，或粘贴、拖入分子结构图片…'} value={selected?.draft ?? ''} onChange={e => { const taskId = ensureTask(); changeTask(taskId, t => ({ ...t, draft: e.target.value })); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) { e.preventDefault(); if (taskId && !selected?.busy) run(taskId); } }} />
      <div className="composer-footer"><div className="actions"><button disabled={captureBusy} onClick={() => fileInput.current?.click()}>上传图片</button>{selected && <button disabled={captureBusy} onClick={() => screenshot(true)}>补一张图</button>}</div>{selected?.busy ? <button className="stop" onClick={() => stop(selected.id)}>停止</button> : <button className="primary" disabled={!selected || (!selected.draft.trim() && !selected.attachments.length)} onClick={() => selected && run(selected.id)}>发送</button>}</div>
      <p className="muted hint">{configured() ? `${workspace.settings.model} · ${workspace.settings.freeOnly ? '仅当前确认免费模型' : '允许所选付费模型'}` : '尚未连接 AI · 可以先体验本机示例'}{!compact && ' · Enter发送，Shift+Enter换行'}</p>
    </div>;
  }
  const latestResult = selected?.messages.filter(m => m.result).at(-1);
  return <div className={`app ${compact ? 'panel-mode' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); attach(Array.from(e.dataTransfer.files)).catch(e => notify(friendly(e))); }} onPaste={e => { const files = Array.from(e.clipboardData.files); if (files.length) { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); if (text) { const taskId = ensureTask(); changeTask(taskId, t => ({ ...t, draft: t.draft + text })); } attach(files).catch(e => notify(friendly(e))); } }}>
    <header className="appbar"><div className="brand"><span className="brand-symbol" aria-hidden="true">R</span><strong>Reaction Canvas</strong></div><div className="actions"><button className="primary" disabled={captureBusy || !ready} onClick={() => screenshot()}>{captureBusy ? '正在截图…' : '截图分析'}</button>{compact && <button onClick={() => switchView(false)}>继续讨论</button>}<button onClick={() => setSettingsOpen(true)}>设置</button></div></header>
    {!isNative() && !window.__RC_TEST_BRIDGE__ && <p className="preview-note">浏览器预览 · 截图、API与系统保存功能请在桌面应用中使用</p>}
    {notice && <div className="notice toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    <input ref={fileInput} className="file-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => { attach(Array.from(e.target.files ?? [])).catch(e => notify(friendly(e))); e.target.value = ''; }} />
    {!ready ? <main className="empty"><p>正在恢复本机历史…</p></main> : <div className="shell">
      {!compact && <aside className="sidebar"><button className="primary" onClick={() => newTask()}>新分析</button><div className="sidebar-heading">{showArchive ? '已归档' : '最近分析'}<button onClick={() => setShowArchive(!showArchive)}>{showArchive ? '返回' : '归档'}</button></div><nav aria-label="分析历史">{workspace.tasks.filter(t => !!t.archived === showArchive).map(t => <button key={t.id} className={t.id === workspace.selected ? 'selected' : ''} onClick={() => update(w => ({ ...w, selected: t.id }))}>{t.busy && <span className="busy-dot" />}<span>{t.title}</span></button>)}</nav><div className="sidebar-bottom"><button onClick={sample}>体验示例（不联网）</button><p className="muted">历史只保存在这台电脑。<br />窗口关闭后可从托盘恢复。</p></div></aside>}
      <main className="content">
        {selected ? <><div className="task-header"><h1>{selected.title}</h1><div className="actions">{compact ? <><button aria-pressed={pinned} onClick={async () => { try { await call('pin_window', { pinned: !pinned }); setPinned(!pinned); } catch(e){ notify(friendly(e)); } }}>{pinned ? '取消置顶' : '置顶'}</button><button onClick={() => { persist().then(() => call('hide_window')).catch(e => notify(friendly(e))); }}>关闭</button></> : <><button onClick={() => switchView(true)}>右侧面板</button><button disabled={!!selected.busy} onClick={() => { changeTask(selected.id, t => ({ ...t, archived: !t.archived })); notify(selected.archived ? '分析已恢复。' : '已归档，可从归档列表恢复。'); }}>{selected.archived ? '恢复分析' : '归档'}</button></>}</div></div>
          <div className="transcript" aria-live="polite">
            {compact ? <>{selected.messages.filter(m=>m.role==='user'&&m.images.length).flatMap(m=>m.images).map((a,i)=><button className="input-preview" key={a.id} onClick={()=>setOriginal(a)}><img src={a.data} alt={`输入图${i+1}`} /><span>输入图 {String.fromCharCode(65+i)}</span></button>)}{latestResult && <ResultView key={latestResult.id} message={latestResult} compact notify={notify} />}{selected.messages.filter(m=>m.role==='user').at(-1)?.text && <p className="muted last-question">最近问题：{selected.messages.filter(m=>m.role==='user').at(-1)!.text}</p>}</> : selected.messages.map(m => m.role === 'user' ? <article className="user-message" key={m.id}><p className="answer">{m.text || '分析图片中的结构与反应'}</p>{!!m.images.length && <div className="input-images">{m.images.map((a,i) => <button key={a.id} className="input-preview" onClick={() => setOriginal(a)}><img src={a.data} alt={`输入图${i+1}`} /><span>{a.name}</span></button>)}</div>}</article> : m.result ? m.id === latestResult?.id ? <ResultView key={m.id} message={m} compact={false} notify={notify} /> : <details className="old-result" key={m.id}><summary>上一版：{m.result.conclusion}</summary><ResultView message={m} compact={false} notify={notify} /></details> : null)}
            {!selected.messages.length && !selected.attachments.length && <div className="empty task-empty"><h2>输入结构或问题，开始分析</h2><p>可以直接截图、粘贴图片，也可以只输入文字。</p><button onClick={sample}>体验示例（不联网）</button></div>}
            {selected.busy && <div className="progress" role="status"><span className="spinner" />正在分析结构与条件…{latestResult && <small>上方为上一版结果，本轮尚未完成。</small>}</div>}
            {selected.error && <div className="error" role="alert"><p>{selected.error}</p><div className="actions"><button disabled={!!selected.busy} onClick={() => run(selected.id, undefined, true)}>重试本轮</button><button onClick={() => { const user = selected.messages.filter(m=>m.role==='user').at(-1); if (user) changeTask(selected.id, t=>({ ...t, draft:user.text, attachments:user.images, messages:t.messages.slice(0,t.messages.findIndex(m=>m.id===user.id)), error:'' })); }}>修改本轮输入</button></div></div>}
          </div>{composer()}</> : <><div className="empty"><div className="empty-symbol">R</div><h1>看到结构，就能开始提问</h1><p>快捷截图在右侧出结果。多张图片和进一步讨论，在这里继续。</p><div className="actions"><button className="primary" onClick={() => screenshot()}>截图分析</button><button onClick={() => fileInput.current?.click()}>上传图片</button></div><button className="sample-link" onClick={sample}>先体验内置示例，无需账号</button></div>{composer()}</>}
      </main>
    </div>}
    {settingsOpen && <SettingsDialog settings={workspace.settings} hasKey={hasKey} save={saveSettings} close={() => setSettingsOpen(false)} notify={notify} backupNew={backupNew} restoreHistory={restoreHistory} />}
    {original && <div className="backdrop original" role="dialog" aria-modal="true" aria-label="查看原图" onClick={() => setOriginal(undefined)}><button onClick={() => setOriginal(undefined)}>关闭原图</button><img src={original.data} alt={original.name} /></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App />);
