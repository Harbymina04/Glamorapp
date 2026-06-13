import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Igual que JwtAuthGuard pero NO bloquea cuando falta o es inválido el token:
 * deja pasar siempre y popula req.user solo si hay un JWT válido. Útil en
 * endpoints públicos que se enriquecen cuando el usuario está autenticado
 * (p. ej. asociar un pedido del storefront a su cuenta sin exigir login).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null; // nunca lanza: invitado => null
  }

  // Evita que un token expirado/ inválido tumbe la petición
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as any;
  }
}
