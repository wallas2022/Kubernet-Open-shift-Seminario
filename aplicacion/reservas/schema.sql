CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 0),
    available integer NOT NULL CHECK (available >= 0 AND available <= capacity)
);
CREATE TABLE IF NOT EXISTS reservations (
    id uuid PRIMARY KEY,
    client_id uuid NOT NULL,
    idempotency_key varchar(128) NOT NULL CHECK (length(idempotency_key) > 0),
    event_id uuid NOT NULL REFERENCES events(id),
    quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
    status text NOT NULL CHECK (status IN ('pending', 'confirmed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS outbox (
    id uuid PRIMARY KEY,
    reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id),
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(created_at, id)
    WHERE processed_at IS NULL;
CREATE TABLE IF NOT EXISTS notification_deliveries (
    event_id uuid PRIMARY KEY REFERENCES outbox(id),
    reservation_id uuid NOT NULL REFERENCES reservations(id),
    delivered_at timestamptz NOT NULL DEFAULT now()
);
