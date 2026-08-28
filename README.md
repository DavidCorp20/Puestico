# Carpooling VE — Plataforma de Carpooling Interurbano

Mercado inicial: Venezuela — corredor Guatire ↔ Caracas
Modelo: Marketplace de dos lados con comisión 15% sobre viajes interurbanos recurrentes

## Estructura del monorepo

```
carpooling-ve/
├── api/                  # Backend — Node.js + NestJS + PostgreSQL
│   ├── openapi.yaml      # Contrato de API (OpenAPI 3.0)
│   └── src/
│       ├── database/
│       │   ├── migrations/   # Esquema SQL
│       │   └── seeds/        # Datos de prueba
│       └── modules/          # Módulos de dominio
│           ├── auth/         # Registro, OTP, JWT
│           ├── users/        # Perfil de usuario
│           ├── drivers/      # Perfil de conductor + verificación
│           ├── vehicles/     # Registro de vehículos
│           ├── trips/        # Publicación y búsqueda de viajes
│           ├── bookings/     # Reservas
│           ├── payments/     # Pagos, comisiones, conciliación
│           ├── reviews/      # Calificaciones bidireccionales
│           ├── incidents/    # Incidentes + botón de pánico
│           ├── chat/         # Chat conductor ↔ pasajero
│           └── admin/        # Panel administrativo
├── mobile/               # App móvil — React Native + Expo
└── admin/                # Panel admin — Next.js
```

## Stack

| Capa          | Tecnología           |
|---------------|----------------------|
| App móvil     | React Native + Expo  |
| Web / Admin   | Next.js              |
| Backend API   | Node.js + NestJS     |
| Base de datos | PostgreSQL + PostGIS |
| Auth          | OTP SMS + JWT        |
| Storage       | S3-compatible        |
| Maps          | Google Maps / Mapbox |
| Push          | FCM                  |

## Inicio rápido

```bash
# Levantar PostgreSQL + API
docker-compose up -d

# API en http://localhost:3000
# Documentación Swagger en http://localhost:3000/api/docs
```

## Entorno de staging

- API: `https://api.staging.carpooling.ve`
 DB: PostgreSQL gestionado
- Documentación: `/api/docs` (Swagger UI desde openapi.yaml)

## Datos de prueba

Ver `api/src/database/seeds/001_seed_data.sql` — incluye:
- 1 admin, 5 conductores (4 aprobados + 1 en revisión), 4 pasajeros
- 5 viajes (programados, activo, completado)
- Reservas, pagos con comisión 15%, calificaciones, chat, incidentes, GPS
