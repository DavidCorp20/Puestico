# Cómo subir el código a GitHub

Mi entorno no tiene credenciales de GitHub, así que el primer push lo tenés
que hacer vos. Es una sola vez: después de esto, el repo queda vivo.

Elegí la opción que te resulte más cómoda. **La opción A no requiere instalar
ni escribir nada en la terminal.**

---

## Opción A — Desde la web de GitHub (sin comandos) ✅ recomendada

1. Descargá del chat el archivo `Puestico-codigo.zip` y descomprimilo.
   Te va a quedar una carpeta con `api`, `admin`, `mobile`, etc.
2. Entrá a https://github.com/DavidCorp20/Puestico
3. Hacé clic en **"uploading an existing file"** (el enlace aparece en el
   texto de la página del repo vacío). Si no lo ves, andá directo a:
   https://github.com/DavidCorp20/Puestico/upload/main
4. Arrastrá **el contenido** de la carpeta descomprimida a la ventana del
   navegador (no la carpeta contenedora: los archivos y subcarpetas de adentro).
5. Abajo escribí un mensaje como `Scaffold inicial` y hacé clic en
   **"Commit changes"**.

Listo. El código queda en GitHub y el equipo puede trabajar encima.

> Nota: esta opción sube los archivos pero no conserva los 3 commits del
> historial. Para el arranque no importa; de acá en adelante el historial
> se construye normalmente.

---

## Opción B — Con GitHub Desktop (interfaz gráfica)

1. Instalá GitHub Desktop: https://desktop.github.com
2. Iniciá sesión con tu cuenta.
3. **File → Clone repository → URL** y pegá:
   `https://github.com/DavidCorp20/Puestico.git`
4. Copiá dentro de esa carpeta el contenido del zip descomprimido.
5. GitHub Desktop te muestra los archivos detectados. Escribí un mensaje
   abajo a la izquierda y hacé clic en **"Commit to main"**.
6. Arriba, clic en **"Push origin"**.

---

## Opción C — Por terminal, conservando el historial completo

Solo si ya usás git. Descargá `puestico.bundle` del chat y corré:

```bash
git clone puestico.bundle Puestico
cd Puestico
git remote set-url origin https://github.com/DavidCorp20/Puestico.git
git push -u origin main
```

Esta es la única opción que conserva los 3 commits con su historial.

Si al pushear te pide contraseña: GitHub ya no acepta la contraseña de la
cuenta. Necesitás un token en https://github.com/settings/tokens
(botón "Generate new token (classic)", marcá el permiso `repo`) y lo usás
en lugar de la contraseña.

---

## Para que yo pueda pushear solo de acá en adelante

Necesitaría un token de GitHub con permiso de escritura cargado como
variable de entorno en mi entorno. **No lo pegues en el chat** — coordinamos
cómo cargarlo de forma segura.
