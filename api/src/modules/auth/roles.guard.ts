import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

/** Marca un controlador o método como reservado a ciertos roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Comprueba el rol del token.
 *
 * Va como guardia y no como un `if` en cada método a propósito: la
 * comprobación repetida a mano es la que se olvida al agregar el
 * endpoint número once, y en el panel de administración ese olvido
 * significa que cualquiera aprueba conductores.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tenés permiso para esta operación');
    }
    return true;
  }
}
