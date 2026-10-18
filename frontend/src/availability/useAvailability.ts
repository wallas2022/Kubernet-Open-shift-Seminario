import { useCallback, useEffect, useRef, useState } from 'react';
import type { Availability } from '../api/contracts';
import { useApiClient } from '../api/useApiClient';
import { useSession } from '../session/SessionContext';

type State = { data: Availability | null; loadedAt: string | null; status: 'loading' | 'ready' | 'refreshing' | 'error' | 'not-found' };

export function useAvailability(eventId: string) {
  const api = useApiClient();
  const { clearCredential } = useSession();
  const [state, setState] = useState<State>({ data: null, loadedAt: null, status: 'loading' });
  const alive = useRef(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!alive.current || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState(previous => ({ ...previous, status: previous.data ? 'refreshing' : 'loading' }));
    const result = await api.availability(eventId, { signal: controller.signal });
    if (!alive.current || controller.signal.aborted || request.current !== controller) return;
    request.current = null;
    if (result.ok) setState({ data: result.data, loadedAt: new Date().toISOString(), status: 'ready' });
    else if (result.status === 401 || result.code === 'missing_credential') clearCredential();
    else if (result.status === 404) setState({ data: null, loadedAt: null, status: 'not-found' });
    else setState(previous => ({ ...previous, status: 'error' }));
  }, [api, clearCredential, eventId]);
  useEffect(() => {
    alive.current = true;
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
