import { Step } from '../components/Step';
import { LaboratoryAccess } from '../session/LaboratoryAccess';
import { useSession } from '../session/SessionContext';
import { CatalogPage } from '../catalog/CatalogPage';
import { useCreation } from '../reservation/CreationContext';
import { RecoveryPage } from '../reservation/RecoveryPage';

export function WelcomePage() {
  const { isAuthenticated } = useSession();
  const { state } = useCreation();
  if (isAuthenticated && state.recovery) return <RecoveryPage />;
  if (isAuthenticated) return <CatalogPage />;
  return <div className="page">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="header">
      <a className="brand" href="/" aria-label="Reservas del seminario, inicio">
        <span className="brand-icon" aria-hidden="true">R</span>
        <span>Reservas<span className="brand-subtitle">DEL SEMINARIO</span></span>
      </a>
      <span className="environment"><span aria-hidden="true" /> Entorno de demostración</span>
    </header>
    <main id="contenido">
      <section className="intro" aria-labelledby="titulo">
        <span className="eyebrow">KUBERNETES Y RED HAT OPENSHIFT</span>
        <h1 id="titulo">Un lugar para<br /><span>tu próximo evento.</span></h1>
        <p className="lead">Consulta los cupos de un evento y conserva la confirmación de tu reserva en un mismo lugar.</p>
        <p className="notice"><span className="notice-icon" aria-hidden="true">i</span>
          <span><strong>Una demo para aprender.</strong><br />Valida tu acceso y consulta el catálogo del laboratorio. Las reservas se habilitarán en las próximas entregas.</span>
        </p>
      </section>
      <LaboratoryAccess />
      {state.recovery && <p className="notice" role="status">Hay una operación pendiente o un registro que requiere revisión. Introduce la misma clave utilizada al enviar. Entrar no reenvía la reserva; la recuperación requiere tu acción explícita.</p>}
      <section className="journey journey-preview" aria-labelledby="recorrido">
        <div className="section-heading"><span className="eyebrow">ASÍ SERÁ EL RECORRIDO</span><h2 id="recorrido">De elegir a confirmar.</h2></div>
        <ol className="steps">
          <Step number="01" title="Consulta el evento">Revisa los cupos disponibles antes de elegir cuántos necesitas.</Step>
          <Step number="02" title="Confirma tu reserva">Revisa el evento y la cantidad antes de enviar la solicitud.</Step>
          <Step number="03" title="Conserva tu comprobante">Guarda el identificador para consultar tu reserva después.</Step>
        </ol>
        <div className="journey-note"><span aria-hidden="true">↗</span><p>Los cupos se confirmarán al procesar cada reserva.</p></div>
      </section>
    </main>
    <footer><span>Seminario de plataformas de contenedores</span><span>Acceso y catálogo · S05</span></footer>
  </div>;
}
