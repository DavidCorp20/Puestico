-- ============================================================
-- Carpooling VE — Esquema PostgreSQL MVP
-- Basado en §22 Modelo de datos del documento maestro
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'blocked');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(255) UNIQUE,
    id_doc          VARCHAR(20)  NOT NULL UNIQUE,  -- cédula V-12345678
    role            user_role    NOT NULL DEFAULT 'passenger',
    status          user_status  NOT NULL DEFAULT 'active',
    selfie_url      TEXT,
    rating          DECIMAL(2,1) DEFAULT 0,
    completed_trips INT          DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── DRIVER PROFILES ────────────────────────────────────────
CREATE TYPE verification_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');

CREATE TABLE driver_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verified            BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    vehicle_id          UUID,  -- FK a vehicles, setado tras registrar vehículo
    rating              DECIMAL(2,1) DEFAULT 0,
    completed_trips     INT DEFAULT 0,
    total_earnings_usd  DECIMAL(10,2) DEFAULT 0,
    background_check    BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ─── VEHICLES ───────────────────────────────────────────────
CREATE TABLE vehicles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plate       VARCHAR(10) NOT NULL UNIQUE,  -- placa única (Q14)
    model       VARCHAR(100) NOT NULL,
    year        INT NOT NULL,
    color       VARCHAR(50),
    seats       INT NOT NULL DEFAULT 4,
    photos      JSONB DEFAULT '[]'::jsonb,    -- array de S3 URLs
    verified    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación driver → vehículo
ALTER TABLE driver_profiles
    ADD CONSTRAINT fk_driver_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

-- ─── VERIFICATION DOCUMENTS ─────────────────────────────────
CREATE TYPE doc_type AS ENUM ('cedula', 'licencia', 'seguro', 'vehicle_photo');
CREATE TYPE doc_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE verification_documents (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type          doc_type NOT NULL,
    file_url          TEXT NOT NULL,
    status            doc_status NOT NULL DEFAULT 'pending',
    rejection_reason  TEXT,
    reviewed_by       UUID REFERENCES users(id),  -- admin
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ
);

-- ─── TRIPS ──────────────────────────────────────────────────
CREATE TYPE trip_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

CREATE TABLE trips (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id           UUID NOT NULL REFERENCES users(id),
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    origin              VARCHAR(255) NOT NULL,
    destination         VARCHAR(255) NOT NULL,
    origin_coords       GEOGRAPHY(POINT, 4326),
    destination_coords  GEOGRAPHY(POINT, 4326),
    departure_date      DATE NOT NULL,
    departure_time      TIME NOT NULL,
    seats_total         INT NOT NULL,
    seats_available     INT NOT NULL,
    price_per_seat_usd  DECIMAL(8,2) NOT NULL,
    price_per_seat_bs   DECIMAL(10,2),
    status              trip_status NOT NULL DEFAULT 'scheduled',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_search
    ON trips (origin, destination, departure_date, status)
    WHERE status = 'scheduled';

CREATE INDEX idx_trips_origin_geo
    ON trips USING GIST (origin_coords);

-- ─── RECURRING TRIPS (V2, pero tabla creada en MVP) ─────────
CREATE TABLE recurring_trips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id       UUID NOT NULL REFERENCES users(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    origin          VARCHAR(255) NOT NULL,
    destination     VARCHAR(255) NOT NULL,
    weekdays        INT[] NOT NULL,  -- [1,2,3,4,5] = lun-vie
    departure_time  TIME NOT NULL,
    return_time     TIME,            -- opcional, viaje de regreso
    seats_total     INT NOT NULL,
    price_per_seat_usd DECIMAL(8,2) NOT NULL,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ───────────────────────────────────────────────
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_id        UUID NOT NULL REFERENCES users(id),
    seats               INT NOT NULL DEFAULT 1,
    status              booking_status NOT NULL DEFAULT 'pending',
    payment_id          UUID,  -- FK a payments
    cancellation_reason TEXT,
    refund_amount       DECIMAL(8,2),
    refund_percentage   INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bloqueo de concurrencia: un puesto no puede tener dos reservas activas (Q10)
CREATE UNIQUE INDEX idx_booking_seat_lock
    ON bookings (trip_id, seats)
    WHERE status IN ('pending', 'confirmed');

-- ─── PAYMENTS ───────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('transfer_usd', 'zelle', 'pago_movil', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'disputed', 'refunded');

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount_usd          DECIMAL(8,2) NOT NULL,
    amount_bs           DECIMAL(10,2),
    commission_usd      DECIMAL(8,2) NOT NULL,  -- 15% del monto
    driver_amount_usd   DECIMAL(8,2) NOT NULL,  -- monto neto
    method              payment_method NOT NULL,
    status              payment_status NOT NULL DEFAULT 'pending',
    reference           VARCHAR(100),           -- ref de transferencia
    confirmed_by        UUID REFERENCES users(id), -- admin
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ
);

ALTER TABLE bookings
    ADD CONSTRAINT fk_booking_payment
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- ─── COMMISSIONS ────────────────────────────────────────────
CREATE TABLE commissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_usd      DECIMAL(8,2) NOT NULL,
    period          VARCHAR(10) NOT NULL,  -- '2026-W35' o '2026-09'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ────────────────────────────────────────────────
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_user_id    UUID NOT NULL REFERENCES users(id),
    to_user_id      UUID NOT NULL REFERENCES users(id),
    rating          INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, from_user_id)  -- una calificación por viaje por usuario
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,   -- 'booking_accepted', 'trip_reminder', 'panic_alert', etc.
    title       VARCHAR(255),
    payload     JSONB,
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INCIDENTS ──────────────────────────────────────────────
CREATE TYPE incident_type AS ENUM ('panic', 'late_cancel', 'wrong_vehicle', 'accident', 'payment_fraud', 'conflict', 'other');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'resolved');

CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    reporter_id     UUID NOT NULL REFERENCES users(id),
    type            incident_type NOT NULL,
    description     TEXT,
    status          incident_status NOT NULL DEFAULT 'open',
    location        GEOGRAPHY(POINT, 4326),
    assigned_to     UUID REFERENCES users(id),  -- admin asignado
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- ─── CHAT ───────────────────────────────────────────────────
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id       UUID NOT NULL REFERENCES users(id),
    passenger_id    UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, driver_id, passenger_id)
);

CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_conversation ON chat_messages (conversation_id, created_at DESC);

-- ─── TRIP LOCATIONS (GPS tracking en vivo) ──────────────────
CREATE TABLE trip_locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    lat         DECIMAL(10,7) NOT NULL,
    lng         DECIMAL(10,7) NOT NULL,
    speed       DECIMAL(5,2),  -- km/h
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_locations ON trip_locations (trip_id, created_at DESC);

-- ─── AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50),
    target_id       UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGERS ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_trips_updated   BEFORE UPDATE ON trips   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
