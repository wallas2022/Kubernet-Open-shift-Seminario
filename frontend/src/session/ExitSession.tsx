import { useEffect, useRef, useState } from 'react';
import { useCreation } from '../reservation/CreationContext';
import { useSession } from './SessionContext';

export function ExitSession({ onExit, failed }: { onExit: (cleaned: boolean) => void; failed: boolean }) {
  const { hasCredential, clearCredential } = useSession();
  const { state, needsExitWarning, close } = useCreation();
  const [confirming, setConfirming] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirming) cancel.current?.focus(); }, [confirming]);
  function finish() {
    const cleaned = close();
    clearCredential();
    setConfirming(false);
    onExit(cleaned);
  }
  function dismiss() { setConfirming(false); trigger.current?.focus(); }
  if (!hasCredential && !state.recovery && !failed && !confirming) return null;
  return <aside className="exit-session" aria-label="Salida de sesión">
    <button ref={trigger} type="button" className="secondary" onClick={() => {
      if (needsExitWarning()) setConfirming(true); else finish();
    }}>Salir</button>
    <p>Salir limpia los datos de esta pestaña. No cancela reservas ni revoca la clave del servidor.</p>
    {confirming && <div className="exit-confirmation" role="alertdialog" aria-modal="false" aria-labelledby="exit-title" aria-describedby="exit-description" onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}>
      <h2 id="exit-title">¿Salir y borrar el pendiente local?</h2>
      <p id="exit-description">Hay una operación en curso, un registro pendiente o no podemos comprobarlo. La reserva podría estar confirmada en el servidor. Al borrar el registro perderás la clave necesaria para recuperarla desde esta pestaña. Conserva el identificador si ya lo tienes o consulta al instructor antes de enviar otra reserva.</p>
      <div className="catalog-actions"><button ref={cancel} type="button" onClick={dismiss}>Cancelar salida</button><button type="button" className="secondary" onClick={finish}>Salir y borrar datos locales</button></div>
    </div>}
    {failed && <p role="alert">La credencial y el comprobante se eliminaron de memoria, pero no pudimos verificar el borrado del pendiente. No envíes otra reserva. Permite el almacenamiento de sesión y vuelve a pulsar Salir para completar la limpieza.</p>}
  </aside>;
}
