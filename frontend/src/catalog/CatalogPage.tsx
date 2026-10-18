import { useEffect, useRef, useState } from 'react';
import type { EventSummary } from '../api/contracts';
import { AvailabilityPage } from '../availability/AvailabilityPage';
import { useSession } from '../session/SessionContext';
import { useCatalog } from './useCatalog';

export function CatalogPage() {
  const { clearCredential } = useSession();
  const { data, status, loadedAt, refresh } = useCatalog();
  const heading = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState<EventSummary | null>(null);
  useEffect(() => { if (!selected) heading.current?.focus(); }, [selected]);
  const busy = status === 'loading' || status === 'refreshing';
  if (selected) return <AvailabilityPage key={selected.id} event={selected} onBack={() => setSelected(null)} />;
  return <div className="page catalog-page">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="header">
      <a className="brand" href="/" aria-label="Reservas del seminario, inicio">
        <span className="brand-icon" aria-hidden="true">R</span>
        <span>Reservas<span className="brand-subtitle">DEL SEMINARIO</span></span>
      </a>
      <span className="environment"><span aria-hidden="true" /> Entorno de demostración</span>
    </header>
    <main id="contenido" className="catalog-main">
      <div className="catalog-heading">
        <div><span className="eyebrow">EVENTOS DEL LABORATORIO</span>
          <h1 ref={heading} tabIndex={-1}>Encuentra tu<br /><span>próximo evento.</span></h1>
          <p className="lead">Consulta el catálogo y los cupos de la última lectura.</p>
        </div>
        <div className="catalog-actions">
          <button type="button" onClick={() => { void refresh(); }} disabled={busy}>
            {busy ? 'Actualizando…' : status === 'error' && !data ? 'Reintentar' : 'Actualizar catálogo'}
          </button>
          <button type="button" className="secondary" onClick={clearCredential}>Volver al acceso</button>
        </div>
      </div>
      <section aria-label="Catálogo de eventos" aria-busy={busy}>
        <div className="catalog-meta">
          <p role="status">{busy ? (data ? 'Actualizando el catálogo. Mostramos la última lectura.' : 'Cargando eventos…')
            : data ? `${data.events.length} ${data.events.length === 1 ? 'evento en el catálogo' : 'eventos en el catálogo'}` : ''}</p>
          {loadedAt && <p>Última lectura: <time dateTime={loadedAt}>{new Date(loadedAt).toLocaleString('es-GT')}</time></p>}
        </div>
        {status === 'error' && <div role="alert" className="catalog-error">
          <strong>{data ? 'Información desactualizada.' : 'No pudimos cargar el catálogo.'}</strong>
          <p>{data ? 'No pudimos actualizar los cupos. Los datos que ves corresponden a la última lectura correcta.'
            : 'Revisa la conexión y vuelve a intentarlo. Todavía no hay datos para mostrar.'}</p>
        </div>}
        {data && data.events.length === 0 && <div className="catalog-empty">
          <span className="empty-symbol" aria-hidden="true">○</span>
          <h2>No hay eventos disponibles</h2>
          <p>{status === 'error' ? 'La última lectura no contenía eventos. Actualiza para comprobar el estado actual.' : 'El catálogo está vacío. Puedes actualizarlo más adelante.'}</p>
        </div>}
        {data && data.events.length > 0 && <div className="event-grid">
          {data.events.map(event => <article key={event.id} className="event-card" aria-labelledby={`event-${event.id}`}>
            <span className="event-tag">{event.available === 0 ? 'SIN CUPOS EN ESTA LECTURA' : 'EVENTO DEL SEMINARIO'}</span>
            <h2 id={`event-${event.id}`}>{event.name}</h2>
            <dl>
              <div className="event-available"><dt>Cupos disponibles</dt><dd>{event.available}</dd></div>
              <div><dt>Capacidad total</dt><dd>{event.capacity}</dd></div>
              <div className="event-identifier"><dt>Identificador del evento</dt><dd>{event.id}</dd></div>
            </dl>
            <button type="button" className="view-availability" onClick={() => setSelected(event)} disabled={busy}
              aria-label={`Consultar disponibilidad de ${event.name}`}>Consultar disponibilidad <span aria-hidden="true">↗</span></button>
          </article>)}
        </div>}
        {data && <p className="catalog-footnote">La disponibilidad puede cambiar. Selecciona un evento para consultar sus cupos. Las reservas se habilitarán próximamente.</p>}
      </section>
    </main>
    <footer><span>Seminario de plataformas de contenedores</span><span>Catálogo y disponibilidad · S06</span></footer>
  </div>;
}
