/** Contracts of the existing API. Transport and session implementation are later sprints. */
export type EventSummary = { id: string; name: string; capacity: number; available: number };
export type Catalog = { events: EventSummary[] };
export type Availability = Pick<EventSummary, 'id' | 'capacity' | 'available'>;
export type Reservation = {
  id: string; event_id: string; quantity: number; status: 'confirmed'; created_at: string;
};
export type ApiTransport = {
  get<T>(path: string, credential: string, signal?: AbortSignal): Promise<T>;
};
