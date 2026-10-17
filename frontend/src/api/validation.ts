import type { Availability, Catalog, Reservation } from './contracts.ts';

export const isUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

export function parseAvailability(value: unknown): Availability | null {
  if (!isRecord(value) || !isUuid(value.id) || !isCount(value.capacity)
    || !isCount(value.available) || value.available > value.capacity) return null;
  return { id: value.id, capacity: value.capacity, available: value.available };
}

export function parseCatalog(value: unknown): Catalog | null {
  if (!isRecord(value) || !Array.isArray(value.events)) return null;
  const events: Catalog['events'] = [];
  const ids = new Set<string>();
  for (const event of value.events) {
    const availability = parseAvailability(event);
    if (!availability || !isRecord(event) || typeof event.name !== 'string' || ids.has(availability.id.toLowerCase())) return null;
    ids.add(availability.id.toLowerCase());
    events.push({ ...availability, name: event.name });
  }
  return { events };
}

export function parseReservation(value: unknown): Reservation | null {
  if (!isRecord(value) || !isUuid(value.id) || !isUuid(value.event_id)
    || !Number.isInteger(value.quantity) || (value.quantity as number) < 1 || (value.quantity as number) > 100
    || value.status !== 'confirmed' || typeof value.created_at !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.created_at)
    || !Number.isFinite(Date.parse(value.created_at))) return null;
  return { id: value.id, event_id: value.event_id, quantity: value.quantity as number,
    status: value.status, created_at: value.created_at };
}
