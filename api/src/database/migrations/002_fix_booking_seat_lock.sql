-- ============================================================
-- 002 — Corrige el bloqueo de puestos y lo hace correcto
--
-- EL PROBLEMA (encontrado al cargar la base de verdad por primera
-- vez): el índice de 001 era
--
--     CREATE UNIQUE INDEX idx_booking_seat_lock
--         ON bookings (trip_id, seats)
--         WHERE status IN ('pending','confirmed');
--
-- La intención era "un puesto no se reserva dos veces". Pero la
-- columna `seats` NO es el número del puesto: es CUÁNTOS puestos
-- reserva ese pasajero. Casi todo el mundo reserva 1. Así que el
-- índice decía en realidad: "en un viaje solo puede haber UNA
-- reserva de un puesto" — el segundo pasajero de cualquier viaje
-- era rechazado por la base de datos.
--
-- Es el tipo de error que no se ve escribiendo código: aparece la
-- primera vez que dos personas reservan el mismo viaje.
--
-- LA CORRECCIÓN: quitar ese índice y proteger lo que de verdad hay
-- que proteger, que son DOS reglas distintas:
--
--   1. Un mismo pasajero no puede tener dos reservas vivas en el
--      mismo viaje (eso sí es un duplicado real).
--   2. La suma de puestos reservados no puede pasar de la capacidad
--      del viaje. Esto no lo puede hacer un índice: se hace con un
--      disparador que bloquea la fila del viaje, para que dos
--      reservas simultáneas no puedan pasar las dos.
-- ============================================================

DROP INDEX IF EXISTS idx_booking_seat_lock;

-- Regla 1: nada de dos reservas vivas del mismo pasajero en un viaje.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_one_per_passenger
    ON bookings (trip_id, passenger_id)
    WHERE status IN ('pending', 'confirmed');

-- Regla 2: no se puede sobrevender el viaje.
--
-- El SELECT ... FOR UPDATE es lo que hace esto seguro de verdad: la
-- segunda transacción espera a la primera, así que las dos no pueden
-- leer el mismo "queda 1 puesto" y confirmarlo las dos. Sin ese
-- bloqueo, con dos personas reservando a la vez el último puesto se
-- venden los dos.
CREATE OR REPLACE FUNCTION assert_seats_available()
RETURNS TRIGGER AS $$
DECLARE
    v_total     INT;
    v_taken     INT;
    v_status    trip_status;
BEGIN
    SELECT seats_total, status INTO v_total, v_status
      FROM trips WHERE id = NEW.trip_id
      FOR UPDATE;

    IF v_total IS NULL THEN
        RAISE EXCEPTION 'El viaje % no existe', NEW.trip_id;
    END IF;

    IF v_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'El viaje % ya está %; no admite reservas',
            NEW.trip_id, v_status;
    END IF;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
      FROM bookings
     WHERE trip_id = NEW.trip_id
       AND status IN ('pending', 'confirmed')
       AND id <> NEW.id;

    IF v_taken + NEW.seats > v_total THEN
        RAISE EXCEPTION
            'Sin puestos: el viaje tiene % y ya hay % reservados (pediste %)',
            v_total, v_taken, NEW.seats
            USING ERRCODE = '23514';
    END IF;

    -- seats_available deja de mantenerse a mano: se deriva de las
    -- reservas vivas. Un contador que se actualiza aparte siempre
    -- termina desincronizado.
    UPDATE trips
       SET seats_available = v_total - (v_taken + NEW.seats),
           updated_at = NOW()
     WHERE id = NEW.trip_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seats_available ON bookings;
CREATE TRIGGER trg_seats_available
    BEFORE INSERT OR UPDATE OF seats, status ON bookings
    FOR EACH ROW
    WHEN (NEW.status IN ('pending', 'confirmed'))
    EXECUTE FUNCTION assert_seats_available();

-- Al cancelar o completar, el puesto vuelve a la calle.
CREATE OR REPLACE FUNCTION release_seats()
RETURNS TRIGGER AS $$
DECLARE
    v_total INT;
    v_taken INT;
BEGIN
    SELECT seats_total INTO v_total FROM trips WHERE id = NEW.trip_id FOR UPDATE;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
      FROM bookings
     WHERE trip_id = NEW.trip_id
       AND status IN ('pending', 'confirmed');

    UPDATE trips
       SET seats_available = GREATEST(v_total - v_taken, 0),
           updated_at = NOW()
     WHERE id = NEW.trip_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_seats ON bookings;
CREATE TRIGGER trg_release_seats
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    WHEN (NEW.status IN ('cancelled', 'completed', 'no_show'))
    EXECUTE FUNCTION release_seats();
