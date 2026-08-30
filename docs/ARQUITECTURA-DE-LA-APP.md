# Cómo está estructurada la app Puestico

Documento técnico para el documento único de negocio.
Estado verificado al 2026-08-30 · commit `1ed2355`

Todo lo que dice acá está comprobado corriendo la aplicación, no
estimado. Donde algo no existe todavía, lo dice con esas palabras.

---

## 1. Qué es Puestico hoy, en una frase

Una aplicación web que funciona como app de celular, donde un pasajero
busca el puesto libre de un carro que ya va para su destino, lo reserva,
lo paga y coordina el encuentro por chat; y donde un conductor publica
los puestos vacíos de un viaje que ya iba a hacer, acepta solicitudes y
cobra.

**Los dos lados funcionan de punta a punta.** Lo que falta para cobrar
dinero real está en la sección 8, y no es programación.

---

## 2. Las dos aplicaciones dentro de una

Desde este cambio, **pasajero y conductor son dos aplicaciones
distintas** con la misma cuenta y el mismo teléfono.

| | Pasajero | Conductor |
|---|---|---|
| Inicio | `/buscar` | `/conductor` |
| Pestañas | Buscar · Mis viajes · Mensajes · Cuenta | Mis viajes · Solicitudes · Mensajes · Cuenta |
| Puede | buscar, reservar, pagar, cancelar, calificar al conductor | publicar, aceptar/rechazar, arrancar, cerrar, cobrar, calificar al pasajero |
| No puede | entrar a nada de conductor | reservar puestos |

El rol se elige en el **primer paso del registro**, antes del teléfono.
Se puede cambiar después desde Mi cuenta sin crear otra cuenta: el mismo
teléfono, la misma reputación, el mismo historial.

### Por qué esto importa para el negocio

Un marketplace de dos lados necesita que cada lado vea su propio
producto. Mientras los dos veían la misma pantalla, no se podía medir
nada por separado ni contarle al usuario una historia coherente.

---

## 3. Recorrido completo del pasajero

1. **Entra** con su teléfono. Sin contraseña.
2. **Verifica** con un código de 6 dígitos.
3. **Da su nombre** (es lo que ve el conductor).
4. **Busca** origen, destino y fecha. Ve precio por puesto, distancia
   real, calificación del conductor y el mapa del recorrido.
5. **Elige un viaje** y ve el detalle: conductor, vehículo, placa,
   reseñas, desglose de la tarifa y mapa.
6. **Reserva** los puestos que necesita. La reserva nace **sin pagar**.
7. **Paga**: pago móvil, efectivo al conductor o tarjeta.
8. **Coordina por chat** con el conductor.
9. **Viaja** y puede seguirlo en el mapa en vivo, con botón de pánico.
10. **Califica** al conductor de 1 a 5 con comentario.

Además: cancelar con política real (más de 2 h antes devuelve todo,
menos de 2 h la mitad), verificar su identidad para obtener el sello, y
ver su **ahorro acumulado** contra lo que habría costado en taxi.

## 4. Recorrido completo del conductor

1. **Entra y se registra** como conductor.
2. **Carga sus documentos** (cédula, licencia, carnet de circulación) y
   queda en verificación.
3. **Publica un viaje**: ruta, fecha, hora, puestos y precio. El precio
   tiene que caer dentro de la banda regulada (sección 6).
4. **Recibe solicitudes** con contador en su pestaña.
5. **Puede preguntarle algo** al pasajero por chat antes de decidir.
6. **Acepta o rechaza**. Al aceptar, el puesto se descuenta.
7. **Arranca el viaje** y lo cierra al terminar.
8. **Ve su liquidación**: cobrado, comisión y lo que le queda.
9. **Califica** al pasajero.

---

## 5. Cómo se estructura por dentro

```
web/                     La aplicación (Next.js 16, React)
  app/
    page.tsx             Portero: manda a cada rol a su inicio
    entrar/              Registro y login en 3 pasos
    buscar/              PASAJERO: buscador y resultados
    viaje/[id]/          Detalle del viaje + mapa
    reserva/[id]/        Confirmar, elegir medio de pago, pagar
    mis-viajes/          PASAJERO: sus reservas y calificaciones
    seguimiento/[id]/    Viaje en vivo + botón de pánico
    conductor/           CONDUCTOR: panel
      solicitudes/         por responder y por calificar
      publicar/            publicar un viaje
      historial/           viajes cerrados y reseñas
      viaje/[id]/          un viaje con sus pasajeros y liquidación
    mensajes/             Bandeja de conversaciones (los dos roles)
    chat/[bookingId]/     Conversación de una reserva
    cuenta/               Perfil, ahorro, cambio de rol, salir
    verificacion/         Cédula + selfie
    metricas/  inicio/    Pantallas para inversores
    api/                  auth · bookings · driver · chat · identidad ·
                          kyc · reviews
  lib/
    auth.ts              Identidad: teléfonos, códigos, sesiones
    session.ts           Quién es el usuario de esta petición
    guard.ts / roles.ts  Control de acceso por rol
    store.ts             Todos los datos (reservas, viajes, mensajes…)
    db.ts                Base de datos y esquema
    fare.ts              Motor de tarifas
    route.ts             Zonas, rutas y carreteras reales
    geometry.ts          Trazado real de 20 rutas (generado)
    metrics.ts           Indicadores del negocio
  test/                  26 pruebas automáticas
  scripts/               Descarga de la geometría de las carreteras

api/                     Backend grande (NestJS) — ver sección 8
docs/                    Este documento y el de costos
```

**Decisión relevante:** hay una sola aplicación web que sirve a los dos
roles, no dos apps ni apps nativas. Es lo que permitió llegar a un
producto completo con el presupuesto disponible.

---

## 6. Las reglas de negocio que ya están programadas

Estas no son intenciones: están en el código y se validan en el
servidor.

**Tarifa regulada por distancia.** La plataforma calcula el precio
sugerido (base $0,80 + $0,11/km + $0,02/min, mínimo $1,50, máximo
$12,00, +10% en hora pico) y define una banda de ±15%. El conductor
elige dentro de la banda. **Publicar fuera de la banda se rechaza.**

Ejemplo real de la aplicación: Guarenas → Altamira, 26,9 km. Intentar
publicar a $25 devuelve *"Muy alto para 26,9 km. El máximo regulado es
$6,25"*.

**Por qué es más que un detalle comercial:** cobrar $0,14/km sin
multiplicador por demanda es lo que sostiene el argumento de "gastos
compartidos" y no "transporte remunerado". La banda es un control de
cumplimiento legal.

**Comisión del 15%**, contra el 20-25% de las apps de viaje privado en
Venezuela.

**Descuento por puesto adicional:** 6% por puesto extra, hasta 18%. Baja
el precio individual y sube nuestro ingreso por viaje — mueve el
indicador de puestos llenos por viaje.

**Política de cancelación:** más de 2 h antes, devolución total; menos
de 2 h, la mitad. Se muestra el monto **antes** de confirmar.

**Otras reglas verificadas:** no se puede sobrevender un viaje; no se
puede reservar el propio; no se puede calificar dos veces; no se puede
calificar un viaje no terminado; el conductor necesita sus 3 documentos.

---

## 7. Seguridad y privacidad

Esto es lo que un inversor con asesor técnico va a revisar.

**Identidad.** El teléfono es la identidad y no hay contraseñas. El
número se normaliza, así que el mismo teléfono escrito de cinco formas
distintas es una sola cuenta.

**Los códigos de verificación se guardan cifrados** (no en claro): un
volcado de la base de datos no abre ninguna cuenta. Vencen a los 10
minutos, admiten 5 intentos y hay límite de códigos por número.

**Las sesiones** usan un identificador opaco en una cookie que el
navegador no puede leer. La identidad se resuelve siempre en el
servidor. Cerrar sesión la anula en la base, no solo borra la cookie.

**Nadie puede actuar en nombre de otro.** Verificado atacando la propia
aplicación: un tercero intentando leer, escribir o pagar en la reserva
de otro recibe "no existe"; un conductor intentando aceptar, arrancar o
ver el viaje de otro conductor, lo mismo. Se responde "no existe" y no
"no tienes permiso", porque lo segundo ya confirma que existe.

**El chat está atado a la reserva**, no a las personas: solo se puede
escribir a alguien con quien se comparte un viaje concreto, y el canal
se cierra cuando el viaje termina. La app no es un directorio de
teléfonos, y queda registro de la coordinación de cada viaje.

**No guardamos cédulas ni selfies en la aplicación.** Se revisan y
queda el resultado, no la imagen. Un repositorio de datos biométricos
mal configurado es la filtración más común que existe.

**No hay ninguna credencial en el repositorio.**

---

## 8. Qué falta, sin adornos

**Lo que sí está funcionando:** los dos recorridos completos, todas las
reglas de negocio de la sección 6, identidad, chat, mapas reales,
persistencia (todo sobrevive reinicios) y 26 pruebas automáticas que
corren en cada cambio.

**Lo que falta, y por qué:**

| Falta | Depende de | Es programación |
|---|---|---|
| Cobrar dinero real | cuenta de pago móvil o pasarela | No |
| Que el código llegue por WhatsApp | cuenta de WhatsApp Business aprobada por Meta | No |
| Facturar | figura legal constituida | No |
| Revisión de identidad por una persona | operación, no código | No |
| Unir la app con el backend grande | — | Sí |
| Notificaciones push | — | Sí |
| Panel de administración | — | Sí |

**El punto importante del cronograma:** el código va a estar listo antes
que los papeles. Los tres trámites de la columna del medio hay que
arrancarlos ahora, en paralelo, porque el de Meta puede tardar semanas.

**Sobre la app y el backend grande.** Hay un backend en NestJS con el
esquema de 18 tablas bien diseñado y las reglas de dinero probadas, pero
la aplicación **no lo usa**: tiene su propia base de datos. Fue una
decisión deliberada para llegar a un producto completo con el
presupuesto disponible. Los nombres de tablas son los mismos a
propósito, así que migrar es copiar y no rehacer. **Para el piloto, la
base actual aguanta de sobra.**

**Sobre las métricas de las pantallas para inversores:** son
proyecciones derivadas del motor de tarifas real, y están rotuladas como
tales. Puestico no tiene todavía un solo viaje real ejecutado.

---

## 9. Lo que cuesta operar

Resumen; el detalle está en `docs/COSTOS-Y-DESPLIEGUE.md`.

- **Costo fijo: $6/mes.** Se paga solo desde ~20 viajes al mes.
- **Verificar por WhatsApp cuesta 17 veces menos que por SMS**
  ($0,0135 contra $0,231). Es la mayor palanca de costo.
- **Una pasarela internacional se lleva el 34% de la comisión** por el
  cargo fijo en un ticket de $6. Con pago móvil venezolano el margen
  sube de 65% a cerca del 95%. Es la mayor palanca de margen, y por eso
  el pago móvil aparece primero y preseleccionado en la aplicación.
- El mapa **no tiene costo**: OpenStreetMap es abierto, sin clave de
  API, y el trazado de las carreteras está guardado en el propio
  código.

---

## 10. Cómo verificar todo esto

```bash
cd web
npm install
npm test        # 26 pruebas
npm run build
npm start       # http://localhost:3100
```

En modo demo el código de verificación aparece en pantalla, porque
WhatsApp no está conectado todavía. Todo lo demás se puede recorrer
completo, por los dos lados.
