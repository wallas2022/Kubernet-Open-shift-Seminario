import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EventSummary, Reservation } from '../api/contracts';
import { isUuid } from '../api/validation';
import { useApiClient } from '../api/useApiClient';
import { useSession } from '../session/SessionContext';
import { ReservationReceiptView } from './ReservationReceipt';
import { readFailureMessage } from '../api/messages';

export function ReservationLookup({ events, onBack }: { events: EventSummary[]; onBack: () => void }) {
  const api = useApiClient();
  const { readCredential, expireCredential } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; field.current?.focus();
    return () => { alive.current = false; request.current?.abort(); request.current = null; };
  }, []);
  useEffect(() => { if (error && !busy) field.current?.focus(); }, [error, busy]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    setReservation(null); setError(null);
    if (!isUuid(identifier)) {
      setError('Introduce el identificador completo con formato 8-4-4-4-12, sin espacios. Puedes copiarlo del comprobante.');
      field.current?.focus(); return;
    }
    const credential = readCredential();
    if (!credential) { expireCredential(); return; }
    const controller = new AbortController(); request.current = controller; setBusy(true);
    const result = await api.reservation(identifier, { signal: controller.signal });
    if (!alive.current || controller.signal.aborted || request.current !== controller || readCredential() !== credential) return;
    request.current = null; setBusy(false);
    if (result.ok) { setReservation(result.data); return; }
    if (result.status === 401 || result.code === 'missing_credential') { expireCredential(); return; }
    setError(readFailureMessage(result, 'reservation'));
    field.current?.focus();
  }
  const eventName = reservation ? events.find(event => event.id.toLowerCase() === reservation.event_id.toLowerCase())?.name : undefined;
  return <div className="page">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="header"><span className="brand">Reservas del seminario</span><span className="environment">Entorno de pruebas</span></header>
    <main id="contenido" tabIndex={-1} className="catalog-main">
      <button type="button" className="back-catalog" onClick={onBack}>← Volver al catálogo</button>
      <h1>Consulta una reserva</h1>
      <p>Introduce el identificador de una reserva creada con tu clave de laboratorio. Esta consulta no muestra un historial de reservas.</p>
      <section className="access-panel" aria-label="Consulta por identificador">
        <form onSubmit={event => { void submit(event); }} noValidate aria-busy={busy}>
          <label htmlFor="reservation-identifier">Identificador de reserva</label>
          <input ref={field} id="reservation-identifier" type="text" autoComplete="off" spellCheck={false}
            value={identifier} disabled={busy} aria-invalid={error !== null}
            aria-describedby={error ? 'lookup-help lookup-error' : 'lookup-help'} aria-errormessage={error ? 'lookup-error' : undefined}
            onChange={event => { setIdentifier(event.target.value); setReservation(null); setError(null); }} />
          <p id="lookup-help">Copia el identificador completo de tu comprobante, incluidos los guiones (formato UUID). Necesitas la misma clave de laboratorio que creó la reserva.</p>
          {error && <p id="lookup-error" role="alert" className="access-error">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Consultando…' : 'Consultar reserva'}</button>
        </form>
        <p role="status" aria-atomic="true">{busy ? 'Consultando la reserva autorizada.' : ''}</p>
      </section>
      {reservation && <ReservationReceiptView reservation={reservation} message="Reserva consultada y confirmada." eventName={eventName} />}
    </main>
    <footer><span>Seminario de plataformas de contenedores</span><span>Consulta de reserva</span></footer>
  </div>;
}
