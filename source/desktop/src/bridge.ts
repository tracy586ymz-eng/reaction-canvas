import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
declare global { interface Window { __RC_TEST_BRIDGE__?: (command: string, args?: Record<string, unknown>) => Promise<unknown>; __TAURI_INTERNALS__?: unknown; initRDKitModule?: (options: Record<string, unknown>) => Promise<any> } }
export const isNative = () => !!window.__TAURI_INTERNALS__;
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (import.meta.env.DEV && window.__RC_TEST_BRIDGE__) return window.__RC_TEST_BRIDGE__(command, args) as Promise<T>;
  if (isNative()) return invoke<T>(command, args);
  if (command === 'load_workspace') return null as T;
  if (command === 'save_workspace' || command === 'show_view' || command === 'pin_window' || command === 'set_shortcut') return undefined as T;
  if (command === 'key_status') return false as T;
  throw Error('这是浏览器预览。请双击桌面应用使用截图和 API 接入。');
}
export async function on<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  if (!isNative()) return () => {};
  return listen<T>(event, e => handler(e.payload));
}
