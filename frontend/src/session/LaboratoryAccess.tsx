import { useEffect, useRef, type FormEvent } from 'react';
import { useSession } from './SessionContext';
import { useLaboratoryAccess } from './useLaboratoryAccess';

export function LaboratoryAccess() {
  const { isAuthenticated, clearCredential, notice } = useSession();
  const { state, login } = useLaboratoryAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const error = state === 'invalid' || state === 'technical' || state === 'validation';
  useEffect(() => {
    const reset = () => formRef.current?.reset();
    window.addEventListener('pagehide', reset);
    return () => window.removeEventListener('pagehide', reset);
  }, []);
  useEffect(() => {
    if (isAuthenticated) titleRef.current?.focus();
    else if (error) fieldRef.current?.focus();
  }, [isAuthenticated, error, state]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = fieldRef.current?.value ?? '';
    formRef.current?.reset();
    void login(value);
  }
  return <section className="access-panel" aria-labelledby="acceso-titulo">
    <span className="eyebrow">{isAuthenticated ? 'ACCESO VALIDADO' : 'TU ESPACIO EN EL LABORATORIO'}</span>
    <h2 id="acceso-titulo" ref={titleRef} tabIndex={-1}>{isAuthenticated ? 'Ya estás dentro.' : 'Accede al laboratorio.'}</h2>
    {isAuthenticated ? <>
      <p role="status">Tu clave se validó correctamente.</p>
      <p>Tu acceso al laboratorio está validado.</p>
      <button type="button" onClick={clearCredential}>Volver al acceso</button>
      <p className="access-footnote">Al volver o recargar se elimina la clave de esta sesión. Esto no revoca la clave del laboratorio.</p>
    </> : <>
      <p>Introduce la clave que te proporcionó el instructor. La usaremos para comprobar tu acceso.</p>
      {notice && <p role="alert" className="access-error">{notice}</p>}
      <form ref={formRef} onSubmit={submit} autoComplete="off" noValidate aria-busy={state === 'checking'}>
        <label htmlFor="laboratory-key">Clave de laboratorio</label>
        <input ref={fieldRef} id="laboratory-key" name="laboratory-key" type="password" autoComplete="off" spellCheck={false}
          disabled={state === 'checking'} aria-invalid={state === 'invalid' || state === 'validation'}
          aria-describedby={error ? 'access-help access-error' : 'access-help'} />
        <p id="access-help" className="access-footnote">Tu clave permanece solo en memoria y se elimina al recargar.</p>
        {error && <p id="access-error" role="alert" className="access-error">{state === 'invalid'
          ? 'La clave no es válida o ya no está habilitada. Revisa la clave con el instructor.'
          : state === 'validation' ? 'Introduce una clave no vacía y sin caracteres no admitidos.'
            : 'No pudimos comprobar el acceso. Revisa la conexión y vuelve a intentarlo.'}</p>}
        <button type="submit" disabled={state === 'checking'}>{state === 'checking' ? 'Comprobando…' : 'Entrar'}</button>
        <p role="status" className="access-status">{state === 'checking' ? 'Comprobando tu acceso al laboratorio.' : ''}</p>
      </form>
    </>}
  </section>;
}
