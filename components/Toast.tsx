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

export const [ToastProvider, useToastInternal] = createContextHook<ToastContext>(() => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: ToastType = 'info', durationMs: number = 2500) => {
    console.log('[Toast] show', { text, type, durationMs });
    const id = `${Date.now()}-${Math.random()}`;
    const msg: ToastMessage = { id, text, type, duration: durationMs };
    setMessages([msg]);
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return useMemo(() => ({ show, messages, clear }), [show, messages, clear]);
});

// Safe wrapper that handles cases where provider is not available
export function useToast(): ToastContext {
  try {
    const context = useToastInternal();
    if (!context) {
      console.warn('[Toast] useToast called outside of ToastProvider, returning fallback');
      return {
        show: (text: string) => console.log('[Toast fallback]', text),
        messages: [],
        clear: () => {}
      };
    }
    return context;
  } catch (error) {
    console.warn('[Toast] useToast error, returning fallback:', error);
    return {
      show: (text: string) => console.log('[Toast fallback]', text),
      messages: [],
      clear: () => {}
    };
  }
}
