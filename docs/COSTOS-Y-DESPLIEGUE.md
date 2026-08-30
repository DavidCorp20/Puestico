# Puestico — Costos de lanzamiento, estado técnico y despliegue

Documento técnico preparado por Engineer para el plan de negocio.
Fecha: 30 de agosto de 2026.

Los números de costo NO son estimaciones a ojo: salen de tarifas
publicadas de proveedores (consultadas en agosto de 2026) aplicadas al
ticket promedio real que produce nuestro motor de tarifas ($6,11).
Donde hay incertidumbre, está dicho.

---

## 1. Resumen para quien no quiera leer todo

- **Lanzar cuesta casi nada: $6 al mes.** La infraestructura para el
  piloto son $5 de Railway más el dominio amortizado. El resto de los
  costos son variables y solo aparecen cuando hay viajes reales.
- **El negocio se paga solo desde ~20 viajes al mes.** Con eso el
  ingreso por comisión ya cubre la infraestructura. Es un umbral muy
  bajo.
- **Dos decisiones de tu lado mueven la aguja mucho más que cualquier
  cosa técnica:**
  1. **Verificar con WhatsApp en vez de SMS ahorra 17 veces**
     ($0,0135 contra $0,231 por mensaje).
  2. **El método de cobro decide si el margen es 65% o 99%.** Una
     pasarela internacional se come un tercio del ingreso en un ticket
     de $6; pago móvil venezolano casi no cobra.
- **Despliegue: se puede tener una dirección pública funcionando en
  1 día.** Un piloto con usuarios reales cobrando de verdad son 3 a 4
  semanas, y el cuello de botella no es el código sino las cuentas de
  pago y de WhatsApp, que dependen de trámites.

---

## 2. Costos de lanzamiento

### 2.1 Costos fijos mensuales

| Concepto | Costo | Nota |
|---|---|---|
| Railway (API + base de datos) | $5,00/mes | Plan Hobby; incluye $5 de consumo |
| Vercel (la app web) | $0,00 | El plan gratuito alcanza para el piloto |
| Dominio .com | $1,00/mes | $12 al año |
| **Total fijo** | **$6,00/mes** | |

Cuando el tráfico crezca, Railway pasa a plan Pro: $20/mes. Eso
recién hace falta alrededor del mes 6.

### 2.2 Costos variables (tarifas unitarias verificadas)

| Concepto | Tarifa | Fuente |
|---|---|---|
| SMS a Venezuela | **$0,231** por mensaje | 360nrs, tarifa transaccional |
| WhatsApp (mensaje de autenticación) | **$0,0135** por mensaje | Tarifa mercado LatAm |
| Pasarela internacional | ~3,5% + $0,10 por transacción | Rango típico de la región |
| Pago móvil venezolano | 0% – 1% | A confirmar con el banco |

**El dato más importante de esta tabla: verificar por WhatsApp es 17
veces más barato que por SMS.** Y además es donde ya está el usuario
venezolano.

### 2.3 Proyección por escenario

Cada usuario nuevo consume ~1,25 verificaciones (uno de cada cuatro
pide el código dos veces).

| Escenario | Viajes/mes | Ingreso (15%) | Costo con SMS | Costo con WhatsApp | Margen (WhatsApp) |
|---|---|---|---|---|---|
| Piloto | 180 | $164,97 | $97,14 | **$64,52** | $100,45 |
| Mes 3 | 340 | $311,61 | $164,68 | **$115,75** | $195,86 |
| Mes 6 | 900 | $824,85 | $418,97 | **$310,22** | $514,63 |
| Mes 12 | 3.200 | $2.932,80 | $1.342,95 | **$1.043,88** | $1.888,92 |

Todos los escenarios dan margen positivo. Elegir WhatsApp en vez de
SMS ahorra desde $33/mes en el piloto hasta $299/mes en el mes 12.

### 2.4 Economía por viaje — y el problema del cargo fijo

Con ticket de $6,11 y comisión del 15%, Puestico ingresa **$0,916 por
viaje**. De ahí:

| Concepto | Monto | % del ingreso |
|---|---|---|
| Ingreso por comisión | $0,916 | 100% |
| Costo de pasarela internacional | −$0,314 | **34%** |
| Verificación amortizada | −$0,009 | 1% |
| **Margen** | **$0,593** | **65%** |

**Un tercio del ingreso se va en la pasarela**, y la culpa es del
cargo fijo de $0,10: en un ticket chico pesa muchísimo.

Cómo se ve según el ticket:

| Ticket | Ingreso | Pasarela | Margen |
|---|---|---|---|
| $3,00 | $0,45 | $0,21 | $0,24 |
| $6,11 | $0,92 | $0,31 | $0,60 |
| $10,00 | $1,50 | $0,45 | $1,05 |
| $20,00 | $3,00 | $0,80 | $2,20 |

**Dos mitigaciones que ya están implementadas o son fáciles:**

1. **Cobrar el viaje completo en una sola transacción**, no puesto por
   puesto. Con 3 puestos, la pasarela baja de 34% a 27% del ingreso.
   Esto ya funciona así en la app.
2. **Cobrar por pago móvil venezolano.** Si la comisión es 0–1%, el
   margen sube de 65% a **entre 92% y 99%**. Es la palanca más grande
   de todo este documento y es una decisión de negocio, no técnica.

---

## 3. Estado técnico: qué se pasó y qué falta

### 3.1 Procesos superados

| # | Proceso | Estado | Evidencia |
|---|---|---|---|
| 1 | Contrato de API (40+ endpoints) | Listo | Swagger consultable |
| 2 | Esquema de base de datos (14 tablas, PostGIS) | Listo | `api/src/database/migrations` |
| 3 | Reglas de negocio del backend | Listo | 28 pruebas unitarias pasando |
| 4 | Integración continua | Listo y verde | Corre en cada push |
| 5 | App del pasajero completa | Listo | buscar → reservar → pagar → seguir |
| 6 | App del conductor completa | Listo | publicar → aceptar → cerrar |
| 7 | Mapa de recorrido (21 zonas) | Listo | SVG propio, sin proveedor pago |
| 8 | Tarifa regulada por distancia | Listo | banda ±15%, validada en servidor |
| 9 | Calificaciones en ambos sentidos | Listo | promedio afecta los listados |
| 10 | Alta de conductor con documentos | Listo | simulada, flujo completo |
| 11 | Política de cancelación | Listo | >2h todo, <2h mitad |
| 12 | Identidad visual y textos es-VE | Listo | logo, paleta accesible, copy |
| 13 | Rediseño como app de celular | Listo | nav inferior, hoja de reserva |
| 14 | Portada y panel de métricas | Listo | para presentación a inversores |
| 15 | **Persistencia de datos** | **Listo hoy** | SQLite; sobrevive reinicios |

El punto 15 se cerró en esta ronda. Antes, un reinicio del servidor
borraba las reservas: era el motivo principal de que el MVP se sintiera
precario. Verificado: se crea una reserva, se reinicia el servidor y la
reserva sigue ahí con su estado, y los puestos siguen descontados.

### 3.2 Lo que falta, con esfuerzo y dependencia

| # | Falta | Peso | Depende de |
|---|---|---|---|
| 1 | Conectar la app web con la API real | Alto | Nada — es trabajo nuestro |
| 2 | Migrar SQLite a PostgreSQL | Medio | Cuenta de Railway |
| 3 | Verificación real (WhatsApp o SMS) | Medio | **Decisión y cuenta tuya** |
| 4 | Cobro real | Alto | **Decisión y cuenta tuya** |
| 5 | Panel de administración | Medio | Nada |
| 6 | Notificaciones al celular | Medio | Nada |
| 7 | Constitución legal y términos | — | **Abogado en Venezuela** |

**Aclaración honesta sobre el punto 1:** hoy la app web y la API son
dos piezas que funcionan pero no se hablan. La app tiene su propia
capa de datos (ya persistente); la API tiene las reglas de negocio y
las pruebas. Unificarlas es el trabajo grande que queda. No es riesgo
técnico —está todo escrito— es volumen de trabajo.

**Los puntos 3, 4 y 7 no los puede resolver el equipo técnico.**
Necesitan que alguien abra cuentas, firme y pague. Son el cuello de
botella real del cronograma.

---

## 4. Cuándo podemos desplegar

Tres hitos distintos que conviene no confundir:

### Hito 1 — Dirección pública para mostrar: **1 día**

Subir lo que hay hoy a Vercel con una dirección propia y permanente.
Cualquiera abre el link desde el celular, sin instalar nada. Sirve para
inversores y para que conductores vean el producto.

Bloqueantes: ninguno. Solo hay que conectar Vercel al repositorio.

### Hito 2 — Piloto cerrado con datos reales: **1 a 2 semanas**

La app conectada a la API sobre PostgreSQL, con un grupo controlado de
conductores y pasajeros conocidos. El cobro se coordina por fuera
(pago móvil manual) y la verificación también.

Bloqueantes: ninguno externo. Es trabajo nuestro.

### Hito 3 — Piloto real cobrando en la app: **3 a 4 semanas**

Verificación automática, cobro dentro de la app, panel de
administración para aprobar conductores.

Bloqueantes, y son de tu lado:
- Cuenta de WhatsApp Business aprobada (trámite con Meta, plazo
  variable: puede ser días o semanas).
- Cuenta de cobro definida y habilitada.
- Figura legal para poder cobrar y facturar.

**Si esos tres trámites arrancan hoy en paralelo al desarrollo, el
hito 3 entra en 3–4 semanas. Si arrancan cuando el código esté listo,
sumá el plazo del trámite completo.** Esta es la recomendación más
concreta de todo el documento: **empezá los trámites ahora**, no al
final.

---

## 5. Recomendaciones técnicas

1. **Verificar por WhatsApp, no por SMS.** 17 veces más barato y es
   donde está el usuario venezolano. Único costo: el trámite de
   aprobación con Meta.
2. **Priorizar el cobro por pago móvil sobre la pasarela
   internacional.** Sube el margen de 65% a ~95%. Es la decisión de
   mayor impacto financiero del proyecto.
3. **Empezar los trámites (WhatsApp, cobro, legal) en paralelo al
   desarrollo.** Es lo único que puede atrasar el lanzamiento.
4. **No invertir más en pulido visual por ahora.** La app ya se ve
   como producto terminado; el rendimiento de seguir puliendo es
   decreciente frente a conectar la API.
5. **Revocar y reemitir el token de GitHub** que quedó en el historial
   del chat. Es deuda de seguridad pendiente.

---

## 6. Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El trámite de WhatsApp se demora | Atrasa el hito 3 | Empezarlo ya; SMS como plan B pese al costo |
| No se consigue cobro digital viable | Bloquea el modelo | Piloto con pago móvil manual mientras se resuelve |
| El cargo fijo de la pasarela come el margen | Margen de 65% a 34% | Cobro por viaje completo; pago móvil |
| Conectividad móvil irregular en el corredor | Mala experiencia | La app ya funciona con poco ancho de banda: sin mapas externos ni imágenes pesadas |
| Concurrencia: dos pasajeros, un puesto | Sobreventa | Ya resuelto y probado, con transacciones en base |

---

## 7. Lo que este documento NO cubre

Por honestidad sobre el alcance: el modelo de negocio completo, la
proyección financiera a 3 años, el marco legal venezolano detallado
(RIF, figura societaria, seguros, régimen del transporte remunerado) y
el programa de incentivos son de Product Manager y Brand Strategist.
Este documento aporta los costos técnicos verificados y el cronograma
de despliegue para que esos números se apoyen en algo real.
