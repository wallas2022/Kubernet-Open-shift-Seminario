import type { ApiFailure } from './contracts.ts';

/** UI copy consumes only normalized codes, never raw server detail. */
export function readFailureMessage(failure: ApiFailure, resource: 'catalog' | 'availability' | 'reservation'): string {
  if (resource === 'reservation' && failure.status === 404) return 'No encontramos una reserva accesible con ese identificador.';
  if (resource === 'availability' && failure.status === 404) return 'No encontramos este evento. Vuelve al catálogo y actualízalo antes de continuar.';
  const subject = resource === 'catalog' ? 'el catálogo' : resource === 'availability' ? 'los cupos' : 'la reserva';
  const prefix = `No pudimos consultar ${subject}.`;
  if (failure.code === 'timeout') return `${prefix} Se agotó el tiempo de espera. Puedes volver a consultar; esta lectura no crea una reserva.`;
  if (failure.code === 'unexpected_response') return `${prefix} La respuesta no pudo validarse. Vuelve a consultar más tarde.`;
  if (failure.status === 429 || failure.status === 503) return `${prefix} El servicio no está disponible temporalmente.${waitHint(failure)} Vuelve a consultar por tu cuenta; no hay reintento automático.`;
  return `${prefix} Revisa la conexión y vuelve a intentarlo.`;
}

function waitHint(failure: ApiFailure): string {
  const seconds = failure.retryAfterSeconds;
  return Number.isSafeInteger(seconds) && seconds! > 0 && seconds! <= 86400 ? ` Espera al menos ${seconds} segundos.` : '';
}

export function creationFailureMessage(failure: ApiFailure): string {
  if (failure.outcome === 'uncertain') {
    const reason = failure.code === 'timeout' ? ' Se agotó el tiempo de espera.'
      : failure.code === 'unexpected_response' ? ' La respuesta no pudo validarse.'
        : failure.status === 503 || failure.status === 429 ? ' El servicio no está disponible temporalmente.' : '';
    return `No pudimos confirmar el resultado.${reason} La reserva podría haberse creado. Conservamos la operación pendiente y no volveremos a enviarla automáticamente.${waitHint(failure)} Puedes recuperar la operación con la misma clave.`;
  }
  const reason = failure.status === 401 || failure.code === 'missing_credential'
    ? 'La clave no permite esta operación. Vuelve a ingresar con la misma clave habilitada por el instructor.'
    : failure.code === 'sold_out' ? 'La API rechazó la reserva por falta de cupos.'
      : failure.code === 'event_not_found' ? 'El evento ya no está disponible. La API rechazó esta operación.'
        : failure.code === 'idempotency_conflict' ? 'La clave de operación ya está asociada a datos diferentes. No cambies la clave ni la cantidad para resolverlo; revisa el caso con el instructor.'
          : failure.code === 'validation_error' ? 'La API rechazó los datos de la reserva. Revisa el caso con el instructor antes de preparar otra intención.'
            : failure.outcome === 'not-sent' ? 'No se envió la solicitud. No pudimos validar el acceso o los datos locales.' : 'La operación no fue confirmada.';
  return `${reason} No hay reintento automático. Conservamos el registro de esta operación.`;
}
