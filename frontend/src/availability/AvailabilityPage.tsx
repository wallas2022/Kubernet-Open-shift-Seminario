import { useEffect, useRef, useState } from 'react';
import type { EventSummary } from '../api/contracts';
import { useSession } from '../session/SessionContext';
import { useAvailability } from './useAvailability';
import { ReservationDraft } from '../reservation/ReservationDraft';

export function AvailabilityPage({ event, onBack }: { event: EventSummary; onBack: () => void }) {
  const { clearCredential } = useSession();
  const { data, loadedAt, status, refresh } = useAvailability(event.id);
  const heading = useRef<HTMLHeadingElement>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  useEffect(() => { heading.current?.focus(); }, []);
  const busy = status === 'loading' || status === 'refreshing';
  return <div className="page availability-page">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="header">
      <a className="brand" href="/" aria-label="Reservas del seminario, inicio"><span className="brand-icon" aria-hidden="true">R</span>
        <span>Reservas<span className="brand-subtitle">DEL SEMINARIO</span></span></a>
      <span className="environment"><span aria-hidden="true" /> Entorno de demostración</span>
    </header>
    <main id="contenido" className="catalog-main">
      <button className="back-catalog" type="button" onClick={onBack}>← Volver al catálogo</button>
      <div className="catalog-heading">
        <div><span className="eyebrow">DISPONIBILIDAD DEL EVENTO</span>
          <h1 ref={heading} tabIndex={-1}>{event.name}</h1>
          <p className="lead">Consulta los cupos antes de preparar tu reserva.</p></div>
        <div className="catalog-actions">
          <button type="button" onClick={() => { setDraftOpen(false); void refresh(); }} disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar disponibilidad'}</button>
          <button type="button" className="secondary" onClick={clearCredential}>Volver al acceso</button>
        </div>
      </div>
      <section aria-label="Disponibilidad del evento" aria-busy={busy}>
        <div className="catalog-meta">
          <p role="status">{busy ? (data ? 'Actualizando disponibilidad. Mostramos la última lectura.' : 'Consultando disponibilidad…')
            : status === 'ready' ? 'Disponibilidad consultada.' : ''}</p>
          {loadedAt && <p>Última lectura: <time dateTime={loadedAt}>{new Date(loadedAt).toLocaleString('es-GT', { timeZoneName: 'short' })}</time></p>}
        </div>
        {status === 'not-found' && <div role="alert" className="catalog-error"><strong>Evento no disponible.</strong>
          <p>No encontramos este evento. Vuelve al catálogo y actualízalo antes de continuar.</p></div>}
        {status === 'error' && <div role="alert" className="catalog-error"><strong>{data ? 'Disponibilidad desactualizada.' : 'No pudimos consultar los cupos.'}</strong>
          <p>{data ? 'La actualización falló. Los valores mostrados pertenecen a la última lectura correcta.' : 'Revisa la conexión y actualiza la disponibilidad. Todavía no hay datos para mostrar.'}</p></div>}
        {data && <article className="availability-card">
          <dl>
            <div className="availability-count"><dt>Cupos disponibles</dt><dd>{data.available}</dd></div>
            <div><dt>Capacidad total</dt><dd>{data.capacity}</dd></div>
            <div className="availability-id"><dt>Identificador del evento</dt><dd>{data.id}</dd></div>
          </dl>
          <div className="reservation-preview">
            {draftOpen && status === 'ready' && data.available > 0
              ? <ReservationDraft key={loadedAt} event={event} availability={data} onCancel={() => { setDraftOpen(false); heading.current?.focus(); }} />
              : <>
            {data.available === 0 && <p className="no-stock" role="status">Sin cupos disponibles en esta lectura.</p>}
            <button type="button" disabled={status !== 'ready' || data.available === 0} onClick={() => setDraftOpen(true)} aria-describedby="reservation-help">Reservar</button>
            <p id="reservation-help">{data.available === 0 ? 'No puedes reservar sin cupos. Puedes actualizar para comprobar si cambian.'
              : status !== 'ready' ? 'Actualiza los cupos antes de preparar una cantidad.' : 'Prepara y revisa tu cantidad antes de cualquier envío.'}</p>
              </>}
          </div>
        </article>}
        <p className="catalog-footnote">Esta lectura es informativa y no garantiza inventario. Los cupos se confirman al procesar una reserva.</p>
      </section>
    </main>
    <footer><span>Seminario de plataformas de contenedores</span><span>Preparación de reserva · S07</span></footer>
  </div>;
}
