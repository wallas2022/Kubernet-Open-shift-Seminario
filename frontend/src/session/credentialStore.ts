/** No persistence, serialization or logging adapter. */
export function createCredentialStore() {
  let credential: string | null = null;
  return {
    read: () => credential,
    replace(value: string) {
      if (!value.trim() || /[\r\n]/.test(value)) return false;
      credential = value;
      return true;
    },
    clear() { credential = null; },
  };
}
