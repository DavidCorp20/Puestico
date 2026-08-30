# Puestico

**Reserva tu puesto en un carro que ya sale hacia tu destino.**
Carpooling interurbano en Venezuela — corredor Guatire ↔ Caracas.

Marketplace de dos lados: quien tiene carro recupera gastos, quien
necesita llegar paga la mitad de un taxi. La plataforma cobra 15% de
comisión sobre cada viaje.

Última actualización: 2026-08-30.

---

## 1. Qué es cada cosa

El proyecto tiene **dos programas** que se despliegan por separado:

| Carpeta | Qué es | Tecnología | Estado |
|---|---|---|---|
| `web/` | **La aplicación que usa la gente.** Pasajero y conductor. | Next.js 16 + React, SQLite | Funcional, en uso |
| `api/` | **El backend.** Contrato completo, base PostgreSQL + PostGIS. | NestJS + `pg` | Funcional, 45 rutas |
| `docs/` | Arquitectura y costos de despliegue | Markdown | Al día |

**Nota importante sobre la duplicación:** hoy `web/` guarda sus datos en
su propio archivo SQLite y **todavía no llama a `api/`**. Fue una
decisión deliberada para tener algo usable sin pagar hosting de base de
datos; los nombres de tablas y columnas de `web/lib/db.ts` copian el
esquema de `api/` a propósito, para que unificar sea una migración de
datos y no una reescritura. **Unificar los dos es el próximo paso
grande.**

---

## 2. Qué puede hacer la aplicación hoy

### Recorrido del pasajero

| Función | Dónde | Detalle |
|---|---|---|
| Entrar con teléfono | `/entrar` | Código de 6 dígitos. Sin contraseñas |
| Entrar sin código | `/entrar` | **Temporal**, mientras WhatsApp no esté conectado |
| Elegir rol al registrarse | `/entrar` | Pasajero o conductor: es el paso uno |
| Buscar viajes | `/buscar` | Origen, destino, fecha, número de puestos |
| Ver el viaje | `/viaje/[id]` | Precio, conductor, reputación, carro y **mapa con la carretera real** |
| Reservar | `/reserva/[id]` | Muestra el desglose antes de confirmar |
| Pagar | `/reserva/[id]` | Pago móvil, transferencia, Zelle o efectivo (registro, ver §7) |
| Mis viajes | `/mis-viajes` | Próximos e historial |
| Seguir el viaje en vivo | `/seguimiento/[id]` | Mapa con la posición y **botón de pánico** |
| Chatear con el conductor | `/chat/[bookingId]` | Solo si tenés reserva en ese viaje |
| Bandeja de mensajes | `/mensajes` | Todas las conversaciones |
| Cancelar con reembolso | `/mis-viajes` | Muestra cuánto te devuelven **antes** de confirmar |
| Calificar | tras el viaje | 1 a 5 con comentario |
| Mi cuenta | `/cuenta` | Perfil, cambiar de rol, primeros pasos |
| Verificar identidad | `/verificacion` | Cédula y selfie |

### Recorrido del conductor

| Función | Dónde | Detalle |
|---|---|---|
| Panel | `/conductor` | Viaje en curso, qué falta responder, qué viene |
| Publicar viaje | `/conductor/publicar` | Ruta, fecha, hora, puestos y precio |
| Solicitudes | `/conductor/solicitudes` | Aceptar o rechazar, con contador |
| Arrancar y cerrar viaje | `/conductor` | Al cerrar se liquida su parte |
| Historial y reseñas | `/conductor/historial` | Viajes cerrados y calificaciones recibidas |
| Chat con pasajeros | `/mensajes` | Mismo canal, sin dar el teléfono |
| Cambiar de rol | `/cuenta` | Mismo teléfono, misma reputación |

### Reglas de negocio programadas

- **Comisión 15%** sobre cada pago: $8,00 → $1,20 plataforma, $6,80 conductor.
- **Banda de tarifa validada en el servidor.** No se puede publicar un
  precio arbitrario: se calcula sobre distancia real y se rechaza fuera
  de banda. Además de comercial es un control legal — sostiene la figura
  de "gastos compartidos" frente al INTT, no de transporte público.
- **Política de cancelación:** el pasajero cancela con más de 2 h → 100%;
  con menos de 2 h → 50%; no se presenta → 0%. El conductor cancela →
  100% al pasajero.
- **Un puesto no se vende dos veces.** Garantizado por la base de datos
  con bloqueo de fila, no por el programa (ver §5).
- **Roles separados de verdad:** cada pantalla verifica en el servidor
  quién sos antes de dibujar nada.
- **Calificación en las dos direcciones**, solo tras el viaje, una vez y
  sin edición.

---

## 3. Estructura del código

```
puestico/
├── web/                          # LA APLICACIÓN
│   ├── app/
│   │   ├── entrar/               # Ingreso: telón animado, marca, rol, código
│   │   ├── buscar/               # Búsqueda de viajes
│   │   ├── viaje/[id]/           # Detalle + mapa
│   │   ├── reserva/[id]/         # Reservar y pagar
│   │   ├── mis-viajes/           # Pasajero
│   │   ├── seguimiento/[id]/     # Mapa en vivo + pánico
│   │   ├── conductor/            # Panel, publicar, solicitudes, historial
│   │   ├── mensajes/ chat/       # Bandeja y conversación
│   │   ├── cuenta/               # Perfil y cambio de rol
│   │   ├── verificacion/         # Identidad
│   │   ├── metricas/             # Números del piloto
│   │   ├── api/                  # Rutas del servidor (auth, bookings, chat…)
│   │   ├── globals.css           # Todo el diseño (un solo archivo)
│   │   ├── fonts.css             # Tipografía propia, autoalojada
│   │   ├── Logo.tsx LogoMark.tsx # Los DOS únicos archivos que dibujan la marca
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db.ts                 # SQLite (node:sqlite, sin dependencias)
│   │   ├── store.ts              # Capa de datos: toda escritura pasa por acá
│   │   ├── auth.ts               # Teléfono, código, sesión, roles
│   │   ├── session.ts guard.ts   # Quién sos / a qué pantallas podés entrar
│   │   ├── fare.ts               # Tarifa y banda de precio
│   │   ├── geometry.ts route.ts  # Curvas reales de la carretera (20 rutas)
│   │   ├── data.ts               # Viajes semilla del corredor
│   │   └── metrics.ts kyc.ts roles.ts
│   ├── middleware.ts             # Puerta de la demo privada (clave de acceso)
│   ├── public/fonts/             # Las 2 familias tipográficas
│   └── test/                     # Pruebas (node:test)
│
├── api/                          # EL BACKEND
│   ├── openapi.yaml              # Contrato
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.service.ts     # Pool de PostgreSQL + transacciones
│   │   │   ├── migrations/       # 001 esquema, 002 puestos, 003 registro
│   │   │   └── seeds/            # Datos de prueba
│   │   ├── modules/
│   │   │   ├── auth/             # Código por teléfono, token, guardia de rol
│   │   │   ├── users/            # Perfil propio y público
│   │   │   ├── drivers/          # Verificación, documentos, ganancias
│   │   │   ├── vehicles/         # Registro de carros, placa única
│   │   │   ├── trips/            # Publicar, buscar (PostGIS), estados, GPS
│   │   │   ├── bookings/         # Reservar (transaccional), cancelar
│   │   │   ├── payments/         # Comisión y políticas de reembolso
│   │   │   ├── reviews/          # Calificaciones bidireccionales
│   │   │   ├── chat/             # Conversaciones por viaje
│   │   │   ├── incidents/        # Reportes y botón de pánico
│   │   │   ├── admin/           # Panel de operaciones + bitácora
│   │   │   └── health/           # Estado del servicio y de la base
│   │   └── main.ts
│   └── test/db.e2e.mjs           # Pruebas contra PostgreSQL real
│
├── docs/
│   ├── ARQUITECTURA-DE-LA-APP.md
│   └── COSTOS-Y-DESPLIEGUE.md
├── docker-compose.yml            # PostGIS + API para desarrollo
└── .github/workflows/ci.yml      # Revisión automática en cada cambio
```

---

## 4. Las 45 rutas del backend

<details><summary><b>Autenticación</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/register` | Alta por teléfono, manda código |
| POST | `/api/auth/login` | Manda código. **No revela si el teléfono existe** |
| POST | `/api/auth/verify-otp` | Valida y devuelve token con el id y rol reales |
| GET | `/api/auth/me` | Quién soy (se relee de la base, no del token) |
</details>

<details><summary><b>Viajes</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/trips` | Buscar. Con `lat/lng/radius_km` usa **PostGIS** y ordena por cercanía |
| GET | `/api/trips/:id` | Detalle con conductor y vehículo |
| GET | `/api/trips/mine` | Mis viajes como conductor |
| POST | `/api/trips` | Publicar. Solo conductor, solo con **su** carro |
| PATCH | `/api/trips/:id/status` | Arrancar/cerrar, con transiciones válidas |
| DELETE | `/api/trips/:id` | Cancelar: cancela reservas y anota reembolsos |
| POST | `/api/trips/:id/location` | Reportar posición. Solo el conductor del viaje |
| GET | `/api/trips/:id/locations` | El recorrido en vivo |
</details>

<details><summary><b>Reservas y pagos</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/bookings` | Reservar. **Transaccional**, crea el pago en el mismo paso |
| GET | `/api/bookings` | Mis reservas (`?as=driver` → solicitudes recibidas) |
| POST | `/api/bookings/:id/cancel` | Cancelar aplicando la política real |
| POST | `/api/bookings/:id/confirm-payment` | Confirmar cobro. Solo conductor o admin |
| POST | `/api/payments` · GET `/api/payments/:id` · POST `/api/payments/:id/confirm` | Pagos |
</details>

<details><summary><b>Personas, conductores y vehículos</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/users/:id` | Perfil público. **Nunca teléfono ni correo** |
| PATCH | `/api/users/:id` | Editar solo el propio |
| GET | `/api/users/:id/reviews` | Su reputación |
| GET | `/api/drivers/me` | Mi ficha: reputación, ganancias, verificación |
| POST | `/api/drivers/me/identity` | Nombre y cédula |
| POST | `/api/drivers/me/documents` | Subir documento (reemplaza el rechazado) |
| GET | `/api/drivers/me/verification-status` | Estado **y qué falta**, paso por paso |
| GET | `/api/drivers/me/earnings` | Bruto, comisión, neto y desglose por viaje |
| POST/GET | `/api/vehicles` | Registrar y listar. **Placa única** en la plataforma |
| GET/PATCH | `/api/vehicles/:id` | Detalle (vista pública si no es tuyo) / editar |
</details>

<details><summary><b>Chat, calificaciones e incidentes</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| GET/POST | `/api/chat/conversations` | Bandeja / abrir la de un viaje (necesita reserva) |
| GET/POST | `/api/chat/conversations/:id/messages` | Leer y escribir. Verifica que participes |
| POST | `/api/reviews` | Calificar: solo tras el viaje, una vez |
| GET | `/api/reviews/pending` | Lo que me queda por calificar |
| GET | `/api/reviews/user/:id` | Calificaciones de alguien |
| POST | `/api/incidents` | Reportar un problema |
| POST | `/api/incidents/panic` | **Pánico: nunca falla por validación** (ver §5) |
| GET | `/api/incidents/mine` | Mis reportes |
</details>

<details><summary><b>Operaciones (solo admin)</b></summary>

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/admin/dashboard` | Qué hay que atender hoy |
| GET | `/api/admin/drivers/pending` | Solicitudes con sus documentos |
| POST | `/api/admin/drivers/:id/approve` · `/reject` | Aprobar o rechazar **con motivo** |
| GET | `/api/admin/payments/pending` · `/report` | Cobros y comisiones por día |
| GET | `/api/admin/incidents` · POST `/:id/resolve` | Pánicos primero |
| POST | `/api/admin/users/:id/suspend` · `/reactivate` | Suspender cuentas |
| GET | `/api/admin/audit-log` | **Toda** acción de operaciones queda registrada |
| GET | `/api/health` | Estado del servicio y de la base (pública) |
</details>

---

## 5. Decisiones que conviene conocer

**El actor sale siempre del token, nunca de la petición.** Si el
programa cliente pudiera decir "soy el conductor X", cualquiera
publicaría viajes, cerraría el viaje de otro —lo que mueve dinero— o
cancelaría reservas ajenas. Se cerró primero en la app y después en el
backend.

**Un puesto no se puede vender dos veces, y lo garantiza la base.**
Cuando alguien reserva, se bloquea la fila del viaje: la segunda
transacción espera y al liberarse ya ve que no queda puesto. Está
probado con dos reservas simultáneas peleando por el último asiento.
`seats_available` se **deriva** de las reservas vivas en vez de llevarse
a mano, porque un contador actualizado desde varios sitios se
desincroniza — y acá desincronizado significa vender un asiento que no
existe.

**El botón de pánico nunca se rechaza.** Es la única operación que no
valida nada: si alguien lo aprieta está en problemas, y responderle
"falta un campo" es inaceptable. Se registra con lo que haya, se avisa a
todos los administradores y se devuelven los datos del conductor y del
carro para que la pantalla pueda mostrar a quién llamar.

**SQL directo, sin ORM.** El corazón es una búsqueda geográfica y una
reserva con bloqueo de fila: las dos se expresan mejor en SQL. El
esquema versionado es la fuente de verdad. `synchronize` no se usa
nunca: en producción puede borrar una columna con datos.

**Mapas sin costo y sin dependencias.** Los mapas son de OpenStreetMap
(abierto, sin clave) y las curvas reales de las 20 rutas del corredor se
descargaron **una vez** y viven dentro del código: cuando alguien usa la
app no hay ni una llamada a un servicio externo. Tampoco se agregó
ninguna librería de mapas —pesan entre 40 y 800 KB— porque el dibujo es
SVG propio.

**Tipografía autoalojada.** Dos familias guardadas en el proyecto
(106 KB, solo caracteres del español): nadie fuera se enteran de quién
abre la app, no hay salto de letra al cargar, y funciona sin acceso al
servidor de fuentes.

**Tres errores del esquema que solo aparecieron al usarlo** (corregidos
en las migraciones 002 y 003): un viaje aceptaba un solo pasajero, no se
podía crear una cuenta con solo teléfono, y los datos de prueba no
cargaban. La causa de que se colaran fue que la revisión automática
cargaba la base **sin detenerse ante errores** y daba verde con la base
a medio cargar. Ya corregido.

---

## 6. Cómo levantarlo

### La aplicación

```bash
cd web
npm ci
npm run dev          # http://localhost:3100
```

Variables (ver `web/.env.example`):

| Variable | Para qué |
|---|---|
| `PUESTICO_DEMO_KEY` | Clave de la demo privada. Sin definir, no hay puerta |
| `PUESTICO_QUICK_ACCESS` | `0` desactiva "entrar sin código" **en el servidor** |
| `PUESTICO_DEMO_OTP` | `0` deja de mostrar el código en pantalla |
| `PUESTICO_DB` | Ruta del archivo SQLite |

### El backend

```bash
cd api
npm ci
createdb carpooling_ve       # necesita PostGIS
psql $DATABASE_URL -v ON_ERROR_STOP=1 \
  -f src/database/migrations/001_initial_schema.sql \
  -f src/database/migrations/002_fix_booking_seat_lock.sql \
  -f src/database/migrations/003_signup_only_needs_phone.sql
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f src/database/seeds/001_seed_data.sql
npm run build && node dist/main   # Swagger en /docs
```

O todo junto: `docker compose up`.

### Pruebas

```bash
cd web && npm test              # 30 — identidad, roles, tarifa, chat, mapas
cd api && npx jest              # 28 — reglas de negocio, sin base de datos
cd api && npm run test:db       # 18 — contra PostgreSQL real (sobreventa,
                                #      concurrencia, PostGIS, comisión)
```

Las 76 corren solas en cada cambio (`.github/workflows/ci.yml`).

---

## 7. Lo que falta, sin adornos

**Trámites tuyos, no programación** — son los que fijan la fecha real:

1. **Cobrar de verdad.** No hay pasarela conectada. El pago se registra
   y el conductor confirma que llegó. Falta acuerdo con un procesador.
2. **WhatsApp.** El código de verificación se registra en el log del
   servidor; con `AUTH_DEMO_OTP=1` vuelve en la respuesta para poder
   probar. Depende de que Meta apruebe la cuenta de WhatsApp Business,
   y eso puede tardar semanas: **arrancalo en paralelo**.
3. **Facturación.** Emitir factura por la comisión.

**Programación pendiente, en orden:**

1. **Unificar `web/` con `api/`** — hoy la app no llama al backend. Es
   el próximo paso grande.
2. **Panel de operaciones con pantallas.** El backend está completo (11
   rutas); falta la interfaz para usarlo sin línea de comandos.
3. **Avisos push.** Las notificaciones se guardan en la base pero no
   salen al teléfono.
4. **Subida real de archivos.** Los documentos del conductor se guardan
   como dirección; falta el almacenamiento.

**Deuda técnica con fecha de vencimiento:**

- **"Entrar sin código"** es temporal. Vence cuando WhatsApp funcione:
  `PUESTICO_QUICK_ACCESS=0` y desaparece del servidor, no solo de la
  pantalla.
- **La clave de la demo** protege el acceso mientras el piloto sea
  privado. Cambiarla caduca al instante todas las sesiones abiertas.
