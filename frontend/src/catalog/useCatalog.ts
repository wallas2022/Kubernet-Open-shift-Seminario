import { useCallback, useEffect, useRef, useState } from 'react';
import type { Catalog } from '../api/contracts';
import { useApiClient } from '../api/useApiClient';
import { useSession } from '../session/SessionContext';

type CatalogState = {
  data: Catalog | null;
  status: 'loading' | 'ready' | 'refreshing' | 'error';
  loadedAt: string | null;
};

export function useCatalog() {
  const api = useApiClient();
  const { clearCredential } = useSession();
  const [state, setState] = useState<CatalogState>({ data: null, status: 'loading', loadedAt: null });
  const alive = useRef(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!alive.current || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState(previous => ({ ...previous, status: previous.data ? 'refreshing' : 'loading' }));
    const result = await api.catalog({ signal: controller.signal });
    if (!alive.current || controller.signal.aborted || request.current !== controller) return;
    request.current = null;
    if (result.ok) {
      setState({ data: result.data, status: 'ready', loadedAt: new Date().toISOString() });
    } else if (result.status === 401 || result.code === 'missing_credential') {
      clearCredential();
    } else {
      setState(previous => ({ ...previous, status: 'error' }));
    }
  }, [api, clearCredential]);
  useEffect(() => {
    alive.current = true;
    // StrictMode's preliminary setup is cancelled before making a request.
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => {
      active = false;
      alive.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);
  return { ...state, refresh };
}
