import createContextHook from '@nkzw/create-context-hook';
import React, { useCallback, useMemo, useState } from 'react';
import Logger from '@/utils/logger';

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

export const [ToastProvider, useToast] = createContextHook<ToastContext>(() => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: ToastType = 'info', durationMs: number = 2500) => {
    console.log('[Toast] show', { text, type, durationMs });
    const id = `${Date.now()}-${Math.random()}`;
    const msg: ToastMessage = { id, text, type, duration: durationMs };
    setMessages([msg]);
    Logger.logEvent('toast_show', { type }).catch(() => {});
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return useMemo(() => ({ show, messages, clear }), [show, messages, clear]);
});
