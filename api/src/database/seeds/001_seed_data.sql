-- ============================================================
-- Carpooling VE — Datos de prueba / Seed
-- Para entorno de staging y QA
--
-- IDEMPOTENTE: se puede correr las veces que se quiera. Sin esto,
-- la segunda ejecución fallaba con "duplicate key" y dejaba la base
-- a medio cargar, que es peor que no cargar nada.
-- CASCADE arrastra las tablas que dependen de estas.
-- ============================================================

TRUNCATE users, driver_profiles, vehicles, trips, bookings, payments,
  reviews, incidents, conversations, chat_messages, trip_locations,
  commissions, notifications, verification_documents, recurring_trips,
  audit_log
  RESTART IDENTITY CASCADE;

-- ─── ADMIN ──────────────────────────────────────────────────
INSERT INTO users (id, name, phone, email, id_doc, role, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Admin Operaciones', '+582120000001', 'admin@carpooling.ve', 'V-00000001', 'admin', 'active');

-- ─── CONDUCTORES ────────────────────────────────────────────
INSERT INTO users (id, name, phone, email, id_doc, role, status, rating, completed_trips)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'María González',    '+584121000001', 'maria@test.ve',  'V-12345601', 'driver', 'active', 4.8, 45),
  ('d1000000-0000-0000-0000-000000000002', 'José Rodríguez',    '+584121000002', 'jose@test.ve',   'V-12345602', 'driver', 'active', 4.6, 28),
  ('d1000000-0000-0000-0000-000000000003', 'Carlos Méndez',     '+584121000003', 'carlos@test.ve', 'V-12345603', 'driver', 'active', 4.2, 12),
  ('d1000000-0000-0000-0000-000000000004', 'Ana Pérez',         '+584121000004', 'ana@test.ve',    'V-12345604', 'driver', 'active', 5.0, 8),
  -- Conductor pendiente de verificación (para QA P2 / Q13)
  ('d1000000-0000-0000-0000-000000000005', 'Luis Hernández',    '+584121000005', 'luis@test.ve',   'V-12345605', 'driver', 'active', 0, 0);

-- ─── PERFILES DE CONDUCTOR ──────────────────────────────────
INSERT INTO driver_profiles (user_id, verified, verification_status, rating, completed_trips, total_earnings_usd)
VALUES
  ('d1000000-0000-0000-0000-000000000001', TRUE,  'approved', 4.8, 45, 306.00),
  ('d1000000-0000-0000-0000-000000000002', TRUE,  'approved', 4.6, 28, 190.40),
  ('d1000000-0000-0000-0000-000000000003', TRUE,  'approved', 4.2, 12, 81.60),
  ('d1000000-0000-0000-0000-000000000004', TRUE,  'approved', 5.0, 8,  54.40),
  ('d1000000-0000-0000-0000-000000000005', FALSE, 'in_review', 0, 0, 0);

-- ─── VEHÍCULOS ──────────────────────────────────────────────
INSERT INTO vehicles (id, owner_id, plate, model, year, color, seats, photos, verified)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'ABC-12A', 'Toyota Corolla',  2018, 'Blanco',  4, '["s3://photos/abc12a-1.jpg","s3://photos/abc12a-2.jpg"]', TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'XYZ-45B', 'Chevrolet Aveo',  2016, 'Plata',   4, '["s3://photos/xyz45b-1.jpg"]', TRUE),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'DEF-78C', 'Ford Fiesta',     2020, 'Negro',   4, '["s3://photos/def78c-1.jpg"]', TRUE),
  ('c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'GHI-90D', 'Honda Civic',     2019, 'Rojo',    4, '["s3://photos/ghi90d-1.jpg"]', TRUE);

-- Actualizar vehicle_id en driver_profiles
UPDATE driver_profiles SET vehicle_id = 'c1000000-0000-0000-0000-000000000001' WHERE user_id = 'd1000000-0000-0000-0000-000000000001';
UPDATE driver_profiles SET vehicle_id = 'c1000000-0000-0000-0000-000000000002' WHERE user_id = 'd1000000-0000-0000-0000-000000000002';
UPDATE driver_profiles SET vehicle_id = 'c1000000-0000-0000-0000-000000000003' WHERE user_id = 'd1000000-0000-0000-0000-000000000003';
UPDATE driver_profiles SET vehicle_id = 'c1000000-0000-0000-0000-000000000004' WHERE user_id = 'd1000000-0000-0000-0000-000000000004';

-- ─── PASAJEROS ──────────────────────────────────────────────
INSERT INTO users (id, name, phone, email, id_doc, role, status, rating, completed_trips)
VALUES
  ('e2000000-0000-0000-0000-000000000001', 'Carlos Ramírez',   '+584142000001', 'carlos.r@test.ve', 'V-98765001', 'passenger', 'active', 4.7, 15),
  ('e2000000-0000-0000-0000-000000000002', 'Beatriz Silva',    '+584142000002', 'beatriz@test.ve',  'V-98765002', 'passenger', 'active', 4.5, 8),
  ('e2000000-0000-0000-0000-000000000003', 'Diego Torres',     '+584142000003', 'diego@test.ve',    'V-98765003', 'passenger', 'active', 4.0, 3),
  ('e2000000-0000-0000-0000-000000000004', 'Elena Vargas',     '+584142000004', 'elena@test.ve',    'V-98765004', 'passenger', 'active', 0, 0);

-- ─── VIAJES ─────────────────────────────────────────────────
INSERT INTO trips (id, driver_id, vehicle_id, origin, destination, origin_coords, destination_coords, departure_date, departure_time, seats_total, seats_available, price_per_seat_usd, price_per_seat_bs, status)
VALUES
  -- Viaje futuro programado (para QA P1: búsqueda y reserva)
  ('f3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Guatire', 'Caracas',
   ST_MakePoint(-66.6111, 10.4739)::geography,
   ST_MakePoint(-66.9036, 10.4806)::geography,
   '2026-09-01', '06:30', 3, 2, 8.00, 480.00, 'scheduled'),

  ('f3000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'Guatire', 'Caracas',
   ST_MakePoint(-66.6111, 10.4739)::geography,
   ST_MakePoint(-66.9036, 10.4806)::geography,
   '2026-09-01', '07:00', 3, 3, 7.00, 420.00, 'scheduled'),

  ('f3000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003',
   'Guarenas', 'Caracas',
   ST_MakePoint(-66.5689, 10.4683)::geography,
   ST_MakePoint(-66.9036, 10.4806)::geography,
   '2026-09-01', '06:45', 4, 4, 6.00, 360.00, 'scheduled'),

  -- Viaje en curso (para QA: GPS tracking + botón de pánico)
  ('f3000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004',
   'Guatire', 'Caracas',
   ST_MakePoint(-66.6111, 10.4739)::geography,
   ST_MakePoint(-66.9036, 10.4806)::geography,
   '2026-08-28', '05:30', 3, 0, 8.00, 480.00, 'active'),

  -- Viaje completado (para QA: calificación + histórico)
  ('f3000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Caracas', 'Guatire',
   ST_MakePoint(-66.9036, 10.4806)::geography,
   ST_MakePoint(-66.6111, 10.4739)::geography,
   '2026-08-27', '17:30', 3, 0, 8.00, 480.00, 'completed');

-- ─── RESERVAS ───────────────────────────────────────────────
-- OJO con el orden: bookings apunta a payments y payments apunta a
-- bookings — es una dependencia circular. Así que las reservas entran
-- SIN pago, después entran los pagos, y al final se enlazan con un
-- UPDATE (más abajo). Insertarlas con payment_id de una falla siempre.
INSERT INTO bookings (id, trip_id, passenger_id, seats, status, payment_id)
VALUES
  -- Reserva confirmada en viaje futuro
  ('b4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 1, 'confirmed', NULL),
  -- Reserva pendiente (esperando pago)
  ('b4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 1, 'pending', NULL),
  -- Dos pasajeros DISTINTOS en el mismo viaje: esto es justo lo que el
  -- índice de la migración 001 hacía imposible (ver 002).
  ('b4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000001', 1, 'confirmed', NULL),
  ('b4000000-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000003', 1, 'confirmed', NULL),
  -- Reserva completada (viaje t5)
  ('b4000000-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000002', 1, 'completed', NULL);

-- ─── PAGOS ─────────────────────────────────────────────────
-- Comisión 15%: precio 8.00 → comisión 1.20 → conductor 6.80
INSERT INTO payments (id, booking_id, amount_usd, amount_bs, commission_usd, driver_amount_usd, method, status, reference, confirmed_by, confirmed_at)
VALUES
  ('a5000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 8.00, 480.00, 1.20, 6.80, 'transfer_usd', 'confirmed', 'TRF-2026-0001', 'a0000000-0000-0000-0000-000000000001', '2026-08-28T04:00:00Z'),
  ('a5000000-0000-0000-0000-000000000002', 'b4000000-0000-0000-0000-000000000003', 8.00, 480.00, 1.20, 6.80, 'zelle',        'confirmed', 'ZEL-2026-0001', 'a0000000-0000-0000-0000-000000000001', '2026-08-28T04:30:00Z'),
  ('a5000000-0000-0000-0000-000000000003', 'b4000000-0000-0000-0000-000000000004', 8.00, 480.00, 1.20, 6.80, 'pago_movil',   'confirmed', 'PM-2026-0001',  'a0000000-0000-0000-0000-000000000001', '2026-08-28T04:35:00Z'),
  ('a5000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000005', 8.00, 480.00, 1.20, 6.80, 'transfer_usd', 'confirmed', 'TRF-2026-0002', 'a0000000-0000-0000-0000-000000000001', '2026-08-27T18:00:00Z');

-- Actualizar payment_id en bookings
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000001' WHERE id = 'b4000000-0000-0000-0000-000000000001';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000002' WHERE id = 'b4000000-0000-0000-0000-000000000003';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000003' WHERE id = 'b4000000-0000-0000-0000-000000000004';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000004' WHERE id = 'b4000000-0000-0000-0000-000000000005';

-- Ahora sí se enlazan las reservas con su pago (ver la nota de arriba).
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000001' WHERE id = 'b4000000-0000-0000-0000-000000000001';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000002' WHERE id = 'b4000000-0000-0000-0000-000000000003';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000003' WHERE id = 'b4000000-0000-0000-0000-000000000004';
UPDATE bookings SET payment_id = 'a5000000-0000-0000-0000-000000000004' WHERE id = 'b4000000-0000-0000-0000-000000000005';

-- ─── COMISIONES ─────────────────────────────────────────────
INSERT INTO commissions (payment_id, amount_usd, period)
VALUES
  ('a5000000-0000-0000-0000-000000000001', 1.20, '2026-W35'),
  ('a5000000-0000-0000-0000-000000000002', 1.20, '2026-W35'),
  ('a5000000-0000-0000-0000-000000000003', 1.20, '2026-W35'),
  ('a5000000-0000-0000-0000-000000000004', 1.20, '2026-W35');

-- ─── CALIFICACIONES ─────────────────────────────────────────
INSERT INTO reviews (trip_id, from_user_id, to_user_id, rating, comment)
VALUES
  ('f3000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 5, 'Excelente conductora, muy puntual'),
  ('f3000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 5, 'Pasajera puntual y respetuosa');

-- ─── GPS DEL VIAJE ACTIVO ───────────────────────────────────
INSERT INTO trip_locations (trip_id, lat, lng, speed)
VALUES
  ('f3000000-0000-0000-0000-000000000004', 10.4739, -66.6111, 0),
  ('f3000000-0000-0000-0000-000000000004', 10.4800, -66.6500, 65),
  ('f3000000-0000-0000-0000-000000000004', 10.4780, -66.7200, 70),
  ('f3000000-0000-0000-0000-000000000004', 10.4790, -66.8000, 55);

-- ─── CONVERSACIÓN DE CHAT ───────────────────────────────────
INSERT INTO conversations (id, trip_id, driver_id, passenger_id)
VALUES ('c6000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001');

INSERT INTO chat_messages (conversation_id, sender_id, content)
VALUES
  ('c6000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Hola, ¿a qué hora sales exactamente?'),
  ('c6000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'A las 6:30 en punto. Te espero en el Centro Guatire.'),
  ('c6000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Perfecto, ahí estaré.');

-- ─── INCIDENTE DE EJEMPLO ───────────────────────────────────
INSERT INTO incidents (trip_id, reporter_id, type, description, status)
VALUES
  ('f3000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000002', 'conflict', 'El conductor se desvió un poco de la ruta pero todo se resolvió.', 'resolved');

-- ─── DOCUMENTOS DE VERIFICACIÓN (conductor pendiente) ───────
INSERT INTO verification_documents (user_id, doc_type, file_url, status)
VALUES
  ('d1000000-0000-0000-0000-000000000005', 'cedula',     's3://docs/luis-cedula.pdf',     'pending'),
  ('d1000000-0000-0000-0000-000000000005', 'licencia',   's3://docs/luis-licencia.pdf',   'pending'),
  ('d1000000-0000-0000-0000-000000000005', 'seguro',     's3://docs/luis-seguro.pdf',     'pending');

-- ─── AUDIT LOG DE EJEMPLO ───────────────────────────────────
INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'APPROVE_DRIVER', 'driver', 'd1000000-0000-0000-0000-000000000001', '{"notes": "Documentos verificados"}'),
  ('a0000000-0000-0000-0000-000000000001', 'CONFIRM_PAYMENT', 'payment', 'a5000000-0000-0000-0000-000000000001', '{"reference": "TRF-2026-0001"}');
