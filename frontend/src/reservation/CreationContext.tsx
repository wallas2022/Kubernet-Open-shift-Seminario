import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createApiClient } from '../api/client';
import { useSession } from '../session/SessionContext';
import { createCreationEngine } from './creationEngine';

const CreationContext = createContext<ReturnType<typeof createCreationEngine> | null>(null);
export function CreationProvider({ children }: { children: ReactNode }) {
  const { readCredential } = useSession();
  const [engine] = useState(() => {
    const api = createApiClient({ readCredential });
    return createCreationEngine({ storage: () => window.sessionStorage, readCredential,
      post: (intent, signal) => api.createReservation(intent, { signal }) });
  });
  useEffect(() => {
    window.addEventListener('pagehide', engine.interrupt);
    return () => { window.removeEventListener('pagehide', engine.interrupt); engine.interrupt(); };
  }, [engine]);
  return <CreationContext.Provider value={engine}>{children}</CreationContext.Provider>;
}
export function useCreation() {
  const engine = useContext(CreationContext);
  if (!engine) throw new Error('Se requiere CreationProvider.');
  return { state: useSyncExternalStore(engine.subscribe, engine.getSnapshot), send: engine.send };
}
