import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  duration: number;
}

export interface ToastContext {
  show: (text: string, type?: ToastType, durationMs?: number) => void;
  messages: ToastMessage[];
  clear: () => void;
}

const defaultToastContext: ToastContext = {
  show: () => console.warn('[Toast] show called outside provider'),
  messages: [],
  clear: () => console.warn('[Toast] clear called outside provider'),
};

export const [ToastProvider, useToast] = createContextHook<ToastContext>(() => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: ToastType = 'info', durationMs: number = 2500) => {
    console.log('[Toast] show', { text, type, durationMs });
    const id = `${Date.now()}-${Math.random()}`;
    const msg: ToastMessage = { id, text, type, duration: durationMs };
    setMessages([msg]);
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return useMemo(() => ({ show, messages, clear }), [show, messages, clear]);
}, defaultToastContext);
