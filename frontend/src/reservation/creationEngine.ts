import type { ApiResult, PendingOperation, Reservation, ReservationIntent } from '../api/contracts.ts';
import { isRecord, isUuid, parseReservation } from '../api/validation.ts';

export const PENDING_KEY = 'seminario.reserva.pendiente.v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Dependencies = {
  storage: () => StoragePort;
  readCredential: () => string | null;
  post: (intent: ReservationIntent, signal: AbortSignal) => Promise<ApiResult<Reservation>>;
  fingerprint?: (credential: string) => Promise<string>;
  operationKey?: () => string;
};
export type CreationState = Readonly<{
  phase: 'idle' | 'preparing' | 'sending' | 'accepted' | 'rejected' | 'uncertain' | 'blocked';
  message: string;
  receipt?: Readonly<{ reservation: Readonly<Reservation>; responseStatus: 200 | 201; pendingCleared: boolean }>;
}>;

/** Reject malformed/extended records without deleting them or trusting their contents. */
export function parsePending(raw: string): PendingOperation | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'credentialFingerprint,eventId,operationKey,quantity,startedAt,state,version'
      || value.version !== 1 || !isUuid(value.eventId) || typeof value.operationKey !== 'string'
      || !/^[A-Za-z0-9._:-]{1,128}$/.test(value.operationKey)
      || typeof value.quantity !== 'number' || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 100
      || typeof value.credentialFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.credentialFingerprint)
      || typeof value.startedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt))
      || (value.state !== 'sending' && value.state !== 'uncertain')) return null;
    return Object.freeze({ version: 1, eventId: value.eventId, quantity: value.quantity, operationKey: value.operationKey,
      credentialFingerprint: value.credentialFingerprint, startedAt: value.startedAt, state: value.state });
  } catch { return null; }
}

export async function credentialFingerprint(credential: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** One engine for the whole app/tab; navigation never resets its synchronous latch. */
export function createCreationEngine(dependencies: Dependencies) {
  let state: CreationState = { phase: 'idle', message: '' };
  const listeners = new Set<() => void>();
  let controller: AbortController | null = null;
  const publish = (phase: CreationState['phase'], message: string) => {
    state = Object.freeze({ phase, message }); listeners.forEach(listener => listener());
  };
  const inspect = () => {
    const raw = dependencies.storage().getItem(PENDING_KEY);
    if (raw === null) return false;
    publish('blocked', parsePending(raw)
      ? 'Hay una operación pendiente en esta pestaña. No se enviará otra reserva ni se reintentará automáticamente. La recuperación estará disponible en S10.'
      : 'El registro pendiente no es válido. El envío está bloqueado para evitar una segunda intención.');
    return true;
  };
  try { inspect(); } catch { publish('blocked', 'No podemos leer el registro de esta pestaña. El envío está bloqueado.'); }

  async function send(review: Readonly<{ eventId: string; quantity: number }>) {
    if (state.phase !== 'idle') return;
    // Freeze before any await: two clicks or two mounted forms cannot create two intentions.
    const snapshot = Object.freeze({ eventId: review.eventId, quantity: review.quantity });
    publish('preparing', 'Guardando la intención antes de enviar…');
    let pending: PendingOperation;
    try {
      if (inspect()) return;
      if (!isUuid(snapshot.eventId) || !Number.isInteger(snapshot.quantity) || snapshot.quantity < 1 || snapshot.quantity > 100)
        throw new Error('invalid review');
      let credential = dependencies.readCredential();
      if (!credential) throw new Error('missing credential');
      const fingerprint = await (dependencies.fingerprint ?? credentialFingerprint)(credential);
      const unchanged = dependencies.readCredential() === credential;
      credential = null;
      if (!unchanged || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('session changed');
      // Check again after the asynchronous fingerprint, before writing anything.
      if (inspect()) return;
      pending = Object.freeze({ ...snapshot, operationKey: (dependencies.operationKey ?? (() => crypto.randomUUID()))(),
        credentialFingerprint: fingerprint, startedAt: new Date().toISOString(), version: 1, state: 'sending' });
      const encoded = JSON.stringify(pending);
      if (!parsePending(encoded)) throw new Error('invalid pending');
      const storage = dependencies.storage();
      storage.setItem(PENDING_KEY, encoded);
      if (storage.getItem(PENDING_KEY) !== encoded) throw new Error('write not retained');
    } catch {
      publish('blocked', 'No se pudo guardar y verificar la intención. No se envió la reserva. El envío queda bloqueado.');
      return;
    }
    controller = new AbortController();
    publish('sending', 'Enviando la reserva. No vuelvas a enviarla.');
    let result: ApiResult<Reservation>;
    try {
      // Pass only the immutable wire intent; never the fingerprint or stored metadata.
      result = await dependencies.post(Object.freeze({ eventId: pending.eventId, quantity: pending.quantity,
        operationKey: pending.operationKey }), controller.signal);
    } catch { result = { ok: false, kind: 'network', outcome: 'uncertain', code: 'network_error' }; }
    controller = null;
    if (result.ok) {
      const reservation = parseReservation(result.data);
      if (reservation && (result.status === 200 || result.status === 201)
        && reservation.event_id.toLowerCase() === pending.eventId.toLowerCase() && reservation.quantity === pending.quantity) {
        let pendingCleared = false;
        try {
          const storage = dependencies.storage();
          // Never delete a record replaced by another actor while the POST was in flight.
          if (storage.getItem(PENDING_KEY) === JSON.stringify(pending)) {
            storage.removeItem(PENDING_KEY);
            pendingCleared = storage.getItem(PENDING_KEY) === null;
          }
        } catch { /* A cleanup failure cannot erase a valid confirmation. */ }
        state = Object.freeze({ phase: 'accepted', message: result.status === 201
          ? 'Reserva creada y confirmada.' : 'Operación recuperada. Esta reserva ya estaba confirmada.',
          receipt: Object.freeze({ reservation: Object.freeze(reservation), responseStatus: result.status, pendingCleared }) });
        listeners.forEach(listener => listener());
        return;
      }
      result = { ok: false, kind: 'protocol', outcome: 'uncertain', code: 'unexpected_response' };
    }
    if (result.outcome === 'uncertain') {
      // The original sending record is already sufficient if this update fails.
      try {
        const storage = dependencies.storage();
        const current = storage.getItem(PENDING_KEY);
        if (current && parsePending(current)?.operationKey === pending.operationKey)
          storage.setItem(PENDING_KEY, JSON.stringify({ ...pending, state: 'uncertain' }));
      } catch { /* Retain the original record; do not unlock or retry. */ }
      publish('uncertain', 'No pudimos confirmar el resultado. La reserva podría haberse creado. Conservamos la operación pendiente y no volveremos a enviarla automáticamente. La recuperación corresponde a S10.');
    } else {
      publish('rejected', result.code === 'sold_out'
        ? 'La API rechazó la reserva por falta de cupos. No hay reintento automático. Conservamos el registro de esta operación.'
        : 'La operación no fue confirmada. No hay reintento automático. Conservamos el registro de esta operación.');
    }
  }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    send,
    interrupt: () => controller?.abort(),
  };
}
