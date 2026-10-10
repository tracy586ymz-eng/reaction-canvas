export interface Molecule { label: string; smiles: string }
export interface Step { reactants: Molecule[]; products: Molecule[]; conditions: string; source: 'prediction' | 'transcribed' }
export interface Result { kind: 'reaction' | 'answer' | 'needs_input'; status: 'candidate' | 'needs_conditions' | 'needs_confirmation' | 'unsupported' | 'unknown'; conclusion: string; answer: string; warnings: string[]; steps: Step[] }
export interface Attachment { id: string; name: string; data: string }
export interface Message { id: string; role: 'user' | 'assistant'; text: string; images: Attachment[]; result?: Result; sample?: boolean }
export interface Task { id: string; title: string; created: number; revision: number; messages: Message[]; draft: string; attachments: Attachment[]; error?: string; busy?: string; archived?: boolean }
export interface Settings { baseUrl: string; model: string; freeOnly: boolean; freeConfirmed: boolean; vision: boolean; consent: boolean; shortcut: string }
export interface Workspace { version: 1; tasks: Task[]; selected: string | null; settings: Settings }
export const defaultSettings: Settings = { baseUrl: 'https://api.siliconflow.cn/v1', model: '', freeOnly: true, freeConfirmed: false, vision: false, consent: false, shortcut: 'CommandOrControl+Shift+Space' };
export const emptyWorkspace = (): Workspace => ({ version: 1, tasks: [], selected: null, settings: { ...defaultSettings } });
