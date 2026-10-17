import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiClient } from '../api/useApiClient';
import { useSession } from './SessionContext';

export type AccessState = 'idle' | 'checking' | 'invalid' | 'technical' | 'validation';

export function useLaboratoryAccess() {
  const { setCredential, clearCredential, confirmCredential } = useSession();
  const api = useApiClient();
  const [state, setState] = useState<AccessState>('idle');
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const hide = () => {
      request.current?.abort();
      request.current = null;
      clearCredential();
      setState('idle');
    };
    window.addEventListener('pagehide', hide);
    return () => {
      alive.current = false;
      request.current?.abort();
      request.current = null;
      window.removeEventListener('pagehide', hide);
    };
  }, [clearCredential]);

  const login = useCallback(async (value: string) => {
    if (!alive.current || request.current) return;
    if (!value.trim() || !setCredential(value)) {
      value = '';
      clearCredential();
      setState('validation');
      return;
    }
    value = '';
    const controller = new AbortController();
    request.current = controller;
    setState('checking');
    const result = await api.catalog({ signal: controller.signal });
    if (!alive.current || controller.signal.aborted || request.current !== controller) return;
    request.current = null;
    if (result.ok && confirmCredential()) {
      setState('idle');
      return;
    }
    clearCredential();
    setState(!result.ok && result.status === 401 ? 'invalid'
      : !result.ok && result.code === 'invalid_request' ? 'validation' : 'technical');
  }, [api, setCredential, clearCredential, confirmCredential]);

  return { state, login };
}
