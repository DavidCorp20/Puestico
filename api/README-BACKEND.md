# Backend Puestico — estado real

Última actualización: 2026-08-30. Escrito por Engineer.

> El detalle completo de funciones y estructura está en el README principal
> del repositorio. Acá queda solo lo específico del backend.

## Qué hace hoy, de verdad

El backend dejó de ser un esqueleto con TODOs y habla con PostgreSQL.
Funciona y está probado contra una base real:

| Qué | Endpoint | Estado |
|---|---|---|
| Pedir código por teléfono | `POST /api/auth/login` | funciona |
| Validar código y entrar | `POST /api/auth/verify-otp` | funciona (token con el id real) |
| Quién soy | `GET /api/auth/me` | funciona |
| Buscar viajes por nombre | `GET /api/trips?origin&destination&date` | funciona |
| **Buscar viajes por cercanía** | `GET /api/trips?lat&lng&radius_km` | funciona con PostGIS, ordena por distancia |
| Ver un viaje | `GET /api/trips/:id` | funciona |
| Publicar viaje | `POST /api/trips` | funciona, solo conductores y solo con su carro |
| Mis viajes (conductor) | `GET /api/trips/mine` | funciona |
| Arrancar / cerrar viaje | `PATCH /api/trips/:id/status` | funciona, con transiciones válidas |
| Posición en vivo | `POST /api/trips/:id/location` | funciona, solo el conductor del viaje |
| Cancelar viaje | `DELETE /api/trips/:id` | funciona, cancela reservas y anota reembolso |
| **Reservar** | `POST /api/bookings` | funciona, transaccional, crea el pago |
| Mis reservas / solicitudes | `GET /api/bookings[?as=driver]` | funciona |
| Confirmar pago | `POST /api/bookings/:id/confirm-payment` | funciona, solo conductor o admin |
| Cancelar reserva | `POST /api/bookings/:id/cancel` | funciona, aplica la política de reembolso |
| Salud del servicio | `GET /api/health` | funciona, incluye estado de la base |

## Tres errores del esquema que aparecieron al usarlo

Ninguno se veía leyendo el código. Aparecieron al cargar la base y
consultarla de verdad. Están corregidos con migraciones nuevas, que se
suman a la 001 sin reescribirla.

**1. Un viaje solo admitía UN pasajero** (migración 002). El índice
`UNIQUE (trip_id, seats)` pretendía evitar que dos personas tomaran el
mismo puesto, pero `seats` es *cuántos* puestos reserva alguien, no cuál.
Como casi todos reservan 1, la base rechazaba al segundo pasajero de
cualquier viaje. Sustituido por: una reserva viva por pasajero y viaje,
más un disparador que impide sobrevender y mantiene `seats_available`
derivado de las reservas.

**2. No se podía crear una cuenta** (migración 003). `name` e `id_doc`
eran obligatorios, pero el registro real es teléfono + código: en ese
momento no hay nombre ni cédula. Ahora son opcionales, el teléfono se
valida en formato `+58##########` (para que la misma persona no tenga
tres cuentas), y nombre y cédula se exigen donde corresponde: para ser
conductor verificado.

**3. La semilla no cargaba.** Cuatro problemas: UUIDs con letras que no
son hexadecimales (`p2...`, `t3...`, `v1...`, `pay5...`), reservas
insertadas con `payment_id` antes de que existieran los pagos (las dos
tablas se apuntan mutuamente), y no era repetible. Ahora carga entera y
se puede correr las veces que se quiera.

Extra: el CI cargaba la base **sin** `ON_ERROR_STOP`, así que psql
seguía tras el error y el paso quedaba verde con la base a medio
cargar. Por eso los tres errores pasaron desapercibidos.

## Cómo levantarlo

```bash
# base de datos (necesita PostGIS)
createdb carpooling_ve
psql $DATABASE_URL -v ON_ERROR_STOP=1 \
  -f api/src/database/migrations/001_initial_schema.sql \
  -f api/src/database/migrations/002_fix_booking_seat_lock.sql \
  -f api/src/database/migrations/003_signup_only_needs_phone.sql
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f api/src/database/seeds/001_seed_data.sql

cd api && npm ci && npm run build
DATABASE_URL=... JWT_SECRET=... AUTH_DEMO_OTP=1 node dist/main
# Swagger en /docs, salud en /api/health
```

## Pruebas

- `npx jest` — 28 pruebas de reglas de negocio, sin base de datos.
- `npm run test:db` — 18 pruebas **contra PostgreSQL real**: sobreventa,
  reservas simultáneas del último puesto (dos transacciones a la vez),
  búsqueda geográfica, comisión del 15%, teléfono único y normalizado.
  Se saltan solas si no hay `DATABASE_URL`.

## Decisiones que vale conocer

- **SQL directo, no ORM.** El corazón es una búsqueda geográfica y una
  reserva con bloqueo de fila: las dos se expresan mejor en SQL. El
  esquema versionado es la fuente de verdad, no unas entidades.
  `synchronize` no se usa nunca: puede borrar una columna con datos.
- **El actor sale siempre del token**, nunca del cuerpo de la petición.
  Si el cliente pudiera decir quién es, cualquiera cancelaría la reserva
  de otro o cerraría el viaje de otro conductor — y cerrar un viaje
  mueve dinero.
- **`seats_available` no se lleva a mano.** Lo deriva la base de las
  reservas vivas. Un contador actualizado desde varios sitios termina
  desincronizado, y acá desincronizado significa vender un puesto que no
  existe.
- **La API arranca aunque la base no responda.** El contrato queda
  visible y `/api/health` dice `degraded`; los endpoints con datos
  responden 503, que es la verdad.

## Lo que sigue faltando

1. **Cobrar de verdad** — no hay pasarela; el pago se registra y lo
   confirma el conductor a mano. Trámite, no programación.
2. **WhatsApp** — el código se registra en el log del servidor. Con
   `AUTH_DEMO_OTP=1` vuelve en la respuesta para poder probar; en
   producción esa variable se deja sin definir. Depende de Meta.
3. **Conectar la app web a esta API** — hoy `web/` guarda todo en
   memoria y no habla con el backend. Es el próximo paso grande de
   programación, y es mío.
4. Chat, notificaciones y panel de administración siguen siendo
   esqueletos.
