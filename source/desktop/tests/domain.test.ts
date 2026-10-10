import { describe, it, expect } from 'vitest';
import { parseResult, offlineSample, restoreWorkspace, acceptResult } from '../src/domain';
import type { Task } from '../src/types';
describe('untrusted chemical responses', () => {
  it('rejects definite products for ambiguous structures', () => { const r = offlineSample(); r.status = 'needs_confirmation'; expect(() => parseResult(JSON.stringify(r))).toThrow('确定产物'); });
  it('rejects malformed and oversized routes', () => { expect(() => parseResult('not JSON')).toThrow(); const r = offlineSample(); r.steps = Array(7).fill(r.steps[0]); expect(() => parseResult(JSON.stringify(r))).toThrow(); });
  it('accepts a fenced valid result without changing SMILES', () => { const r = offlineSample(); expect(parseResult('```json\n'+JSON.stringify(r)+'\n```').steps[0].products[0].smiles).toBe('CC(=O)OCC'); });
});
describe('task revisions and recovery', () => {
  it('rejects late result after cancellation or revision', () => { const t = { revision: 3, busy: 'abc' } as Task; expect(acceptResult(t,3,'abc')).toBe(true); expect(acceptResult(t,2,'abc')).toBe(false); expect(acceptResult({...t,busy:undefined},3,'abc')).toBe(false); });
  it('restores drafts but never resumes an in-flight billable request', () => { const t = { id:'task', title:'test', busy:'old', revision:1, messages:[], attachments:[], draft:'saved draft' }; const r = restoreWorkspace({version:1,tasks:[t],selected:'task'}); expect(r.tasks[0].busy).toBeUndefined(); expect(r.tasks[0].draft).toBe('saved draft'); expect(r.tasks[0].error).toContain('中断'); });
  it('never replaces an incompatible history with an empty workspace',()=>{expect(()=>restoreWorkspace({version:999,tasks:[]})).toThrow('停止自动覆盖');});
});
