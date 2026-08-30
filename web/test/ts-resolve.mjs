/**
 * Resolvedor para poder probar los módulos de `lib/` con `node --test`.
 *
 * Next resuelve `./db` a `./db.ts` por su cuenta; Node, cuando quita
 * los tipos, exige la extensión exacta. Antes que ensuciar el código de
 * producción con `.ts` en cada import (que Next no quiere), este gancho
 * hace la misma resolución que Next solo durante las pruebas.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const ext of ['.ts', '.tsx', '.js']) {
      try {
        const candidate = new URL(specifier + ext, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) {
          return next(specifier + ext, context);
        }
      } catch {
        // Especificador que no es una ruta de archivo: sigue el camino normal.
      }
    }
  }
  return next(specifier, context);
}
