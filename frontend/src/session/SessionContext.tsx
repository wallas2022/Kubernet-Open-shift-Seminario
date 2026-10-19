import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createCredentialStore } from './credentialStore';

type Session = {
  hasCredential: boolean;
  isAuthenticated: boolean;
  setCredential: (value: string) => boolean;
  readCredential: () => string | null;
  clearCredential: () => void;
  confirmCredential: () => boolean;
  expireCredential: () => void;
  notice: string | null;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createCredentialStore);
  const [hasCredential, setHasCredential] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const alive = useRef(true);
  const clearCredential = useCallback(() => {
    store.clear();
    setHasCredential(false);
    setIsAuthenticated(false);
    setNotice(null);
  }, [store]);
  const expireCredential = useCallback(() => {
    clearCredential();
    setNotice('El acceso ya no está autorizado. Vuelve a ingresar con una clave habilitada. Si hay una operación pendiente, utiliza la misma clave original; el registro se conserva.');
  }, [clearCredential]);
  useEffect(() => {
    alive.current = true;
    window.addEventListener('pagehide', clearCredential);
    return () => {
      alive.current = false;
      window.removeEventListener('pagehide', clearCredential);
      store.clear();
    };
  }, [store, clearCredential]);
  const setCredential = useCallback((value: string) => {
    if (!alive.current || !store.replace(value)) return false;
    setHasCredential(true);
    setIsAuthenticated(false);
    setNotice(null);
    return true;
  }, [store]);
  const readCredential = useCallback(() => alive.current ? store.read() : null, [store]);
  const confirmCredential = useCallback(() => {
    if (!alive.current || !store.read()) return false;
    setIsAuthenticated(true);
    return true;
  }, [store]);
  return <SessionContext.Provider value={{ hasCredential, isAuthenticated, setCredential, readCredential, clearCredential, confirmCredential, expireCredential, notice }}>
    {children}
  </SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Se requiere SessionProvider.');
  return session;
}
