import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSession } from './SessionContext';

export function TemporaryCredentialPanel() {
  const { hasCredential, setCredential, clearCredential } = useSession();
  const [error, setError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const reset = () => formRef.current?.reset();
    window.addEventListener('pagehide', reset);
    return () => window.removeEventListener('pagehide', reset);
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.elements.namedItem('credential') as HTMLInputElement;
    const accepted = setCredential(field.value);
    form.reset();
    setError(!accepted);
    field.focus();
  }
  return <section className="credential-panel" aria-labelledby="credencial-titulo">
    <h2 id="credencial-titulo">Prueba local de credencial</h2>
    <p>Usa un valor de prueba. Se conserva solo en memoria hasta recargar o limpiar. Este panel no valida acceso ni envía la credencial a la API.</p>
    <form ref={formRef} onSubmit={submit} autoComplete="off">
      <label htmlFor="credential">Credencial temporal</label>
      <input id="credential" name="credential" type="password" autoComplete="off" spellCheck={false} aria-invalid={error} aria-describedby={error ? 'credential-error' : undefined} />
      {error && <p id="credential-error" role="alert">Introduce un valor no vacío y sin saltos de línea.</p>}
      <div className="credential-actions">
        <button type="submit">Conservar en memoria</button>
        <button type="button" onClick={() => { clearCredential(); formRef.current?.reset(); setError(false); }}>Limpiar credencial</button>
      </div>
    </form>
    <p role="status">{hasCredential ? 'Credencial temporal presente. Acceso sin validar.' : 'Sin credencial en memoria.'}</p>
  </section>;
}
