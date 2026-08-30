-- ============================================================
-- 003 — El registro solo necesita el teléfono
--
-- EL PROBLEMA: en 001, `users.name` y `users.id_doc` son NOT NULL.
-- Pero el registro real de la app es "escribe tu teléfono y te llega
-- un código": en ese momento no se tiene ni el nombre ni la cédula.
-- El nombre llega en el paso siguiente, y la cédula solo cuando la
-- persona verifica identidad — que muchos pasajeros nunca hacen.
--
-- Con el esquema de 001, crear la cuenta al validar el código era
-- IMPOSIBLE: la base rechazaba la fila. Es el mismo desajuste que
-- tenía el índice de puestos: el esquema describía un formulario
-- largo, y el producto es un login por teléfono.
--
-- LA CORRECCIÓN: name e id_doc pasan a opcionales. La unicidad de la
-- cédula se mantiene, pero ignorando los nulos, para que muchas
-- cuentas sin cédula puedan convivir.
--
-- Lo que NO se relaja: para ser CONDUCTOR sí hacen falta nombre y
-- cédula. Eso se exige donde corresponde, con una restricción sobre
-- driver_profiles, no obligando a todo el mundo desde el registro.
-- ============================================================

ALTER TABLE users ALTER COLUMN name    DROP NOT NULL;
ALTER TABLE users ALTER COLUMN id_doc  DROP NOT NULL;

-- El UNIQUE de columna de 001 ya ignora los NULL en Postgres, pero se
-- deja explícito como índice parcial para que quede documentado.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_doc_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_doc
    ON users (id_doc) WHERE id_doc IS NOT NULL;

-- El teléfono se guarda SIEMPRE normalizado a +58...: sin esto, el
-- mismo usuario se registra tres veces (0412..., +58412..., 412...).
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_phone_e164;
ALTER TABLE users ADD CONSTRAINT chk_users_phone_e164
    CHECK (phone ~ '^\+58[0-9]{10}$');

-- Para ser conductor sí hacen falta nombre y cédula.
CREATE OR REPLACE FUNCTION assert_driver_is_identified()
RETURNS TRIGGER AS $$
DECLARE
    v_name   TEXT;
    v_id_doc TEXT;
BEGIN
    SELECT name, id_doc INTO v_name, v_id_doc
      FROM users WHERE id = NEW.user_id;

    IF NEW.verified IS TRUE AND (v_name IS NULL OR v_id_doc IS NULL) THEN
        RAISE EXCEPTION
            'Un conductor verificado necesita nombre y cédula cargados'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_identified ON driver_profiles;
CREATE TRIGGER trg_driver_identified
    BEFORE INSERT OR UPDATE OF verified ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION assert_driver_is_identified();
