import type { ApiErrorCode, ApiFailure, ApiResult, ApiTransport, RequestOptions, ReservationIntent } from './contracts.ts';
import { apiPaths } from './paths.ts';
import { isRecord, isUuid, parseAvailability, parseCatalog, parseReservation } from './validation.ts';

export const DEFAULT_TIMEOUT_MS = 15_000;
type Configuration = { readCredential: () => string | null; timeoutMs?: number; fetcher?: typeof fetch };
type Parser<T> = (value: unknown) => T | null;
const domainStatuses: Partial<Record<ApiErrorCode, number>> = {
  invalid_credentials: 401, event_not_found: 404, reservation_not_found: 404,
  sold_out: 409, idempotency_conflict: 409, retry_later: 503, database_unavailable: 503,
};
const jsonType = (response: Response) => /^application\/(?:[\w.-]+\+)?json$/i.test(
  (response.headers.get('content-type') ?? '').split(';')[0].trim());
function errorCode(body: unknown, status: number): ApiErrorCode {
  if (!isRecord(body)) return 'http_error';
  const candidate = typeof body.error === 'string' ? body.error : body.detail;
  if (typeof candidate === 'string' && Object.hasOwn(domainStatuses, candidate)
    && domainStatuses[candidate as ApiErrorCode] === status) return candidate as ApiErrorCode;
  if (status === 422 && Array.isArray(body.detail)) return 'validation_error';
  return 'http_error';
}
function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after');
  if (value === null) return undefined;
  if (/^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  }
  // HTTP-date guidance only; it never schedules a request.
  if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined;
}

/** One explicit call makes at most one fetch. No persistence, redirects or automatic retries. */
export function createApiClient(configuration: Configuration): ApiTransport {
  const timeoutMs = configuration.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647)
    throw new Error('Tiempo de espera inválido.');
  const fetcher = configuration.fetcher ?? globalThis.fetch.bind(globalThis);
  const local = (code: 'missing_credential' | 'invalid_request'): ApiFailure =>
    ({ ok: false, kind: 'local', outcome: 'not-sent', code });

  async function request<T>(path: string, parse: Parser<T>, options: RequestOptions = {}, intent?: ReservationIntent): Promise<ApiResult<T>> {
    const post = intent !== undefined;
    if (options.signal?.aborted) return { ok: false, kind: 'cancelled', outcome: 'not-sent', code: 'cancelled' };
    let credential: string | null;
    try { credential = configuration.readCredential(); } catch { return local('missing_credential'); }
    if (!credential) return local('missing_credential');
    if (options.signal?.aborted) return { ok: false, kind: 'cancelled', outcome: 'not-sent', code: 'cancelled' };
    // Fetch headers trim whitespace and reject non-byte values: reject rather than alter identity.
    if (!/^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/.test(credential)) return local('invalid_request');
    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: () => void = () => {};
    let externalAbort: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error('Solicitud interrumpida.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      externalAbort = () => controller.abort();
      options.signal?.addEventListener('abort', externalAbort, { once: true });
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    });
    try {
      const work = async (): Promise<ApiResult<T>> => {
        const headers: Record<string, string> = { Accept: 'application/json', 'X-Api-Key': credential! };
        if (intent) { headers['Content-Type'] = 'application/json'; headers['Idempotency-Key'] = intent.operationKey; }
        const response = await fetcher(path, {
          method: post ? 'POST' : 'GET', headers, signal: controller.signal,
          ...(intent ? { body: JSON.stringify({ event_id: intent.eventId, quantity: intent.quantity }) } : {}),
          credentials: 'omit', cache: 'no-store', redirect: 'error', mode: 'same-origin', referrerPolicy: 'no-referrer',
        });
        if (response.redirected || response.type === 'opaqueredirect')
          return { ok: false, kind: 'protocol', outcome: post ? 'uncertain' : 'read-failed', code: 'unexpected_response' };
        let body: unknown = null;
        if (jsonType(response)) {
          try { body = await response.json(); } catch {
            // Do not turn a body-read timeout/network failure into a definite rejection.
            if (controller.signal.aborted) throw new Error('Solicitud interrumpida.');
            if (response.ok) return { ok: false, kind: 'protocol', outcome: post ? 'uncertain' : 'read-failed', code: 'unexpected_response', status: response.status };
          }
        } else { await response.body?.cancel(); }
        if (!response.ok) {
          const code = errorCode(body, response.status);
          const rejected = code === 'invalid_credentials' || code === 'event_not_found'
            || code === 'sold_out' || code === 'idempotency_conflict' || code === 'validation_error';
          return { ok: false, kind: 'http', outcome: post ? (rejected ? 'rejected' : 'uncertain') : 'read-failed',
            code, status: response.status, ...(response.status === 429 || response.status === 503
              ? { retryAfterSeconds: retryAfter(response) } : {}) };
        }
        const data = parse(body);
        if (!data || !(response.status === 200 || (post && response.status === 201)))
          return { ok: false, kind: 'protocol', outcome: post ? 'uncertain' : 'read-failed', code: 'unexpected_response', status: response.status };
        return { ok: true, status: response.status as 200 | 201, data };
      };
      return await Promise.race([work(), interrupted]);
    } catch {
      return { ok: false, kind: timedOut ? 'timeout' : controller.signal.aborted ? 'cancelled' : 'network',
        outcome: post ? 'uncertain' : 'read-failed',
        code: timedOut ? 'timeout' : controller.signal.aborted ? 'cancelled' : 'network_error' };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', externalAbort);
      controller.signal.removeEventListener('abort', onAbort);
      credential = null;
    }
  }
  return {
    catalog: options => request(apiPaths.catalog, parseCatalog, options),
    availability: (id, options) => isUuid(id)
      ? request(apiPaths.availability(id), body => {
        const data = parseAvailability(body);
        return data?.id.toLowerCase() === id.toLowerCase() ? data : null;
      }, options) : Promise.resolve(local('invalid_request')),
    reservation: (id, options) => isUuid(id)
      ? request(apiPaths.reservation(id), body => {
        const data = parseReservation(body);
        return data?.id.toLowerCase() === id.toLowerCase() ? data : null;
      }, options) : Promise.resolve(local('invalid_request')),
    createReservation: (intent, options) => {
      if (!isUuid(intent.eventId) || !Number.isInteger(intent.quantity) || intent.quantity < 1 || intent.quantity > 100
        || !/^[A-Za-z0-9._:-]{1,128}$/.test(intent.operationKey)) return Promise.resolve(local('invalid_request'));
      // Snapshot prevents callers mutating the body while the response is being checked.
      const snapshot = { eventId: intent.eventId, quantity: intent.quantity, operationKey: intent.operationKey };
      return request(apiPaths.createReservation, body => {
        const data = parseReservation(body);
        return data?.event_id.toLowerCase() === snapshot.eventId.toLowerCase() && data.quantity === snapshot.quantity ? data : null;
      }, options, snapshot);
    },
  };
}
