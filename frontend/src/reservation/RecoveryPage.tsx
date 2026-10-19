import { useEffect, useRef } from 'react';
import { useSession } from '../session/SessionContext';
import { useCreation } from './CreationContext';
import { ReservationReceipt } from './ReservationReceipt';

export function RecoveryPage() {
  const { state, recover } = useCreation();
  const { clearCredential } = useSession();
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = state.phase === 'preparing' || state.phase === 'sending';
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className="page">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="header"><span className="brand">Reservas del seminario</span><span className="environment">Entorno de pruebas</span></header>
    <main id="contenido" className="catalog-main">
      <h1 ref={heading} tabIndex={-1}>Recupera tu operación</h1>
      {state.receipt ? <ReservationReceipt /> : <section className="reservation-receipt" aria-label="Estado de envío" aria-busy={busy}>
        <h2>Estado de la operación</h2>
        <p role={busy ? 'status' : 'alert'}>{state.message}</p>
        {state.pending && <>
          <dl className="draft-summary">
            <div><dt>Identificador del evento</dt><dd>{state.pending.eventId}</dd></div>
            <div><dt>Cupos solicitados</dt><dd>{state.pending.quantity}</dd></div>
            <div><dt>Inicio de la operación</dt><dd><time dateTime={state.pending.startedAt}>{new Date(state.pending.startedAt).toLocaleString('es-GT', { timeZoneName: 'short' })}</time></dd></div>
          </dl>
          <p>Recuperar repite únicamente la clave de operación y los datos originales. Si la reserva ya existe, se mostrará la misma confirmación. No prepara una reserva diferente.</p>
          <div className="catalog-actions"><button type="button" disabled={busy} onClick={() => { void recover(); }}>{busy ? 'Verificando operación…' : 'Recuperar operación pendiente'}</button></div>
        </>}
        {!state.pending && <p>No podemos utilizar este registro. No lo borres ni prepares otra reserva sin revisar el resultado con el instructor.</p>}
        <div className="catalog-actions"><button type="button" className="secondary" disabled={busy} onClick={clearCredential}>Usar otra clave de laboratorio</button></div>
        <p>Al cambiar de clave conservamos el pendiente. La reserva podría existir aunque no hayas recibido respuesta.</p>
      </section>}
    </main>
    <footer><span>Seminario de plataformas de contenedores</span><span>Recuperación · S10</span></footer>
  </div>;
}
