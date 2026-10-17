/** Contracts of the existing API and conservative transport results. */
export type EventSummary = { id: string; name: string; capacity: number; available: number };
export type Catalog = { events: EventSummary[] };
export type Availability = Pick<EventSummary, 'id' | 'capacity' | 'available'>;
export type Reservation = {
  id: string; event_id: string; quantity: number; status: 'confirmed'; created_at: string;
};
export type ReservationIntent = Readonly<{ operationKey: string; eventId: string; quantity: number }>;
/** Future S08/S10 persistence contract. Never include a credential or full response. */
export type PendingOperation = ReservationIntent & Readonly<{
  version: 1;
  credentialFingerprint: string;
  startedAt: string;
  state: 'sending' | 'uncertain';
}>;
export type ApiErrorCode = 'missing_credential' | 'invalid_request' | 'cancelled' | 'timeout' | 'network_error'
  | 'unexpected_response' | 'http_error' | 'validation_error' | 'invalid_credentials' | 'event_not_found'
  | 'reservation_not_found' | 'sold_out' | 'idempotency_conflict' | 'retry_later' | 'database_unavailable';
export type ApiFailure = {
  ok: false;
  kind: 'local' | 'cancelled' | 'timeout' | 'network' | 'protocol' | 'http';
  outcome: 'not-sent' | 'read-failed' | 'rejected' | 'uncertain';
  code: ApiErrorCode;
  status?: number;
  retryAfterSeconds?: number;
};
export type ApiResult<T> = { ok: true; status: 200 | 201; data: T } | ApiFailure;
export type RequestOptions = { signal?: AbortSignal };
export type ApiTransport = {
  catalog(options?: RequestOptions): Promise<ApiResult<Catalog>>;
  availability(eventId: string, options?: RequestOptions): Promise<ApiResult<Availability>>;
  reservation(reservationId: string, options?: RequestOptions): Promise<ApiResult<Reservation>>;
  createReservation(intent: ReservationIntent, options?: RequestOptions): Promise<ApiResult<Reservation>>;
};
