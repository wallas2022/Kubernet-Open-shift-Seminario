import { useEffect, useRef } from 'react';
import { useCreation } from './CreationContext';
import type { Reservation } from '../api/contracts';

export function ReservationReceipt() {
  const { state } = useCreation();
  if (!state.receipt) return null;
  return <ReservationReceiptView reservation={state.receipt.reservation} message={state.message}
    cleanupWarning={!state.receipt.pendingCleared} />;
}

export function ReservationReceiptView({ reservation, message, cleanupWarning = false, eventName }: {
  reservation: Readonly<Reservation>; message: string; cleanupWarning?: boolean; eventName?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
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
    <p>Conserva el identificador de tu reserva. Este comprobante permanece en esta sesión y se pierde al recargar la página.</p>
    {cleanupWarning && <p role="alert">La reserva está confirmada, pero no pudimos verificar la limpieza del registro pendiente. No vuelvas a enviarla.</p>}
    <p>Esta función está en pruebas. La confirmación no acredita el envío de correo.</p>
  </section>;
}
