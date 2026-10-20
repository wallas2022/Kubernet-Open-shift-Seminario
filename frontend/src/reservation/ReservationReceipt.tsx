import { useEffect, useRef, useState, useId } from 'react';
import { useAvailability } from '../availability/useAvailability';
import { useCreation } from './CreationContext';
import type { Reservation } from '../api/contracts';

export function ReservationReceipt({ refreshAvailability = true }: { refreshAvailability?: boolean }) {
  const { state } = useCreation();
  if (!state.receipt) return null;
  return <><ReservationReceiptView reservation={state.receipt.reservation} message={state.message}
    cleanupWarning={!state.receipt.pendingCleared} />
    {refreshAvailability && <ConfirmedAvailability eventId={state.receipt.reservation.event_id} />}</>;
}

function ConfirmedAvailability({ eventId }: { eventId: string }) {
  const { data, status, refresh } = useAvailability(eventId);
  return <section className="receipt-availability" aria-label="Cupos después de confirmar">
    <p role="status">{status === 'ready' ? `Cupos disponibles después de confirmar: ${data?.available}. Esta lectura no garantiza inventario.`
      : status === 'loading' || status === 'refreshing' ? 'Actualizando cupos después de confirmar…' : ''}</p>
    {(status === 'error' || status === 'not-found') && <p role="alert">No pudimos actualizar los cupos. Tu reserva sigue confirmada; conserva el comprobante.</p>}
    <button type="button" disabled={status === 'loading' || status === 'refreshing'} onClick={() => { void refresh(); }}>Actualizar cupos del comprobante</button>
  </section>;
}

export function ReservationReceiptView({ reservation, message, cleanupWarning = false, eventName }: {
  reservation: Readonly<Reservation>; message: string; cleanupWarning?: boolean; eventName?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const identifier = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'manual'>('idle');
  const generation = useRef(0);
  useEffect(() => { generation.current++; setCopyState('idle'); return () => { generation.current++; }; }, [reservation.id]);
  async function copyIdentifier() {
    const current = generation.current;
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(reservation.id);
      if (generation.current === current) setCopyState('copied');
    } catch {
      if (generation.current === current) { setCopyState('manual'); identifier.current?.focus(); identifier.current?.select(); }
    }
  }
  useEffect(() => { heading.current?.focus(); }, [reservation]);
  return <section className="reservation-receipt" aria-label="Comprobante de reserva">
    <h2 ref={heading} tabIndex={-1}>Comprobante de reserva</h2>
    <p role="status">{message}</p>
    <dl className="draft-summary">
      <div><dt>Identificador de reserva</dt><dd>{reservation.id}</dd></div>
      <div><dt>Identificador del evento</dt><dd>{reservation.event_id}</dd></div>
      {eventName !== undefined && <div><dt>Evento del catálogo</dt><dd>{eventName}</dd></div>}
      <div><dt>Cupos reservados</dt><dd>{reservation.quantity}</dd></div>
      <div><dt>Estado</dt><dd>Confirmada</dd></div>
      <div><dt>Fecha de creación</dt><dd><time dateTime={reservation.created_at}>{new Date(reservation.created_at).toLocaleString('es-GT', { timeZoneName: 'short' })}</time></dd></div>
    </dl>
    <label htmlFor={fieldId}>Identificador para copiar</label>
    <input id={fieldId} ref={identifier} readOnly value={reservation.id} onFocus={event => event.currentTarget.select()} />
    <button type="button" disabled={copyState === 'copying'} onClick={() => { void copyIdentifier(); }}>Copiar identificador</button>
    <p role="status">{copyState === 'copied' ? 'Identificador copiado.' : copyState === 'manual'
      ? 'No pudimos copiar automáticamente. El identificador está seleccionado; usa Copiar en el menú del dispositivo o Ctrl+C (⌘C en Mac).'
      : 'También puedes seleccionar el identificador y copiarlo manualmente.'}</p>
    <p>Conserva el identificador de tu reserva. Este comprobante permanece en esta sesión y se pierde al recargar la página.</p>
    {cleanupWarning && <p role="alert">La reserva está confirmada, pero no pudimos verificar la limpieza del registro pendiente. No vuelvas a enviarla.</p>}
    <p>Esta función está en pruebas. La confirmación no acredita el envío de correo.</p>
  </section>;
}
