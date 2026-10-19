import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Availability, EventSummary } from '../api/contracts';
import { validateQuantity } from './quantity';

export function ReservationDraft({ event, availability, onCancel }: {
  event: EventSummary; availability: Availability; onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState('1');
  const [phase, setPhase] = useState<'editing' | 'review' | 'confirmed'>('editing');
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Readonly<{ eventId: string; quantity: number }> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase === 'editing') input.current?.focus();
    else heading.current?.focus();
  }, [phase]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateQuantity(quantity, availability.available);
    if (!result.ok) {
      setError(result.reason === 'invalid' ? 'Introduce un entero de 1 a 100, sin espacios, decimales ni otros signos.'
        : result.reason === 'insufficient' ? 'La cantidad supera los cupos de la última lectura.' : 'Actualiza la disponibilidad antes de continuar.');
      input.current?.focus();
      return;
    }
    setError(null);
    setReview(Object.freeze({ eventId: availability.id, quantity: result.value }));
    setPhase('review');
  }
  function edit() { setReview(null); setPhase('editing'); }
  return <section className="reservation-draft" aria-label="Preparación de reserva">
    <h2 ref={heading} tabIndex={-1}>{phase === 'editing' ? 'Prepara tu cantidad.' : phase === 'review' ? 'Revisa tu cantidad.' : 'Cantidad revisada.'}</h2>
    {phase === 'editing' ? <form onSubmit={submit} noValidate>
      <label htmlFor="reservation-quantity">Cantidad de cupos</label>
      <input ref={input} id="reservation-quantity" type="text" inputMode="numeric" autoComplete="off" value={quantity}
        onChange={event => { setQuantity(event.target.value); setError(null); }} aria-invalid={error !== null}
        aria-describedby={error ? 'quantity-help quantity-error' : 'quantity-help'} />
      <p id="quantity-help">Un entero entre 1 y 100, sin superar los cupos de esta lectura.</p>
      {error && <p id="quantity-error" role="alert" className="quantity-error">{error}</p>}
      <button type="submit">Revisar cantidad</button>
      <button type="button" className="draft-secondary" onClick={onCancel}>Cancelar preparación</button>
    </form> : <>
      <dl className="draft-summary">
        <div><dt>Evento</dt><dd>{event.name}</dd></div>
        <div><dt>Identificador</dt><dd>{review?.eventId}</dd></div>
        <div><dt>Cupos solicitados</dt><dd>{review?.quantity}</dd></div>
      </dl>
      {phase === 'review' ? <>
        <p>Comprueba el evento y la cantidad antes de confirmar. Aún no se ha enviado ninguna reserva.</p>
        <button type="button" onClick={() => setPhase('confirmed')}>Confirmar cantidad</button>
        <button type="button" className="draft-secondary" onClick={edit}>Volver a editar</button>
      </> : <>
        <p role="status">La cantidad quedó revisada. Aún no se ha enviado ninguna reserva.</p>
        <button type="button" disabled aria-describedby="send-help">Enviar reserva</button>
        <p id="send-help">El envío de reservas estará disponible próximamente.</p>
        <button type="button" className="draft-secondary" onClick={edit}>Modificar cantidad</button>
      </>}
      <button type="button" className="draft-secondary" onClick={onCancel}>Cancelar preparación</button>
    </>}
    <p>La disponibilidad puede cambiar. Si actualizas los cupos tendrás que revisar la cantidad de nuevo.</p>
  </section>;
}
