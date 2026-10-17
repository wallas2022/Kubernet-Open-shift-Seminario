import { useMemo } from 'react';
import { useSession } from '../session/SessionContext';
import { createApiClient } from './client';

/** Reads the current in-memory credential per request; does not retain a token snapshot. */
export function useApiClient() {
  const { readCredential } = useSession();
  return useMemo(() => createApiClient({ readCredential }), [readCredential]);
}
