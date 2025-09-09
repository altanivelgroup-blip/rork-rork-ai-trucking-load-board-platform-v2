import { Platform, DeviceEventEmitter } from 'react-native';

export type FormFillPayload = Record<string, any>;

let staged: FormFillPayload | null = null;
export function stageFormFill(data: FormFillPayload) { staged = data; }
export function consumeStagedFormFill(): FormFillPayload | null {
  const d = staged; staged = null; return d;
}

export function emitFormFill(data: FormFillPayload) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('formfill', { detail: data }));
  } else {
    DeviceEventEmitter.emit('formfill', data);
  }
}

export function subscribeFormFill(handler: (d: FormFillPayload) => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const fn = (e: any) => handler(e.detail);
    window.addEventListener('formfill', fn);
    return () => window.removeEventListener('formfill', fn);
  } else {
    const sub = DeviceEventEmitter.addListener('formfill', handler);
    return () => sub.remove();
  }
}
