const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function identifier(value: string) {
  if (!uuid.test(value)) throw new Error('Identificador de recurso inválido.');
  return value;
}

/** Paths contain resource identifiers only: never credentials or arbitrary query strings. */
export const apiPaths = {
  catalog: '/api/catalogo',
  availability: (eventId: string) => `/api/eventos/${identifier(eventId)}/disponibilidad`,
  reservation: (reservationId: string) => `/api/reservas/${identifier(reservationId)}`,
} as const;
