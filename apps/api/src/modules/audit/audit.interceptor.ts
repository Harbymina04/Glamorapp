import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No audit metadata → skip
    if (!meta) return next.handle();

    const req   = context.switchToHttp().getRequest();
    const user  = req.user;

    // Only audit authenticated requests
    if (!user?.tenantId) return next.handle();

    return next.handle().pipe(
      tap((result) => {
        try {
          // Extract entityId
          let entityId: string | null = null;
          if (meta.entityIdFrom === 'result' && result) {
            entityId = result?.[meta.entityIdField ?? 'id'] ?? null;
          } else if (meta.entityIdFrom === 'param') {
            entityId = req.params?.[meta.entityIdField ?? 'id'] ?? null;
          } else if (meta.entityIdFrom === 'body') {
            entityId = req.body?.[meta.entityIdField ?? 'id'] ?? null;
          }

          // Resolve description — supports {field} placeholders from result
          let description = meta.description ?? null;
          if (description && result) {
            description = description.replace(/\{(\w+)\}/g, (_: string, key: string) =>
              String(result[key] ?? ''),
            );
          }

          this.auditService.log({
            tenantId:    user.tenantId,
            storeId:     user.storeId  ?? null,
            userId:      user.id       ?? null,
            userEmail:   user.email    ?? null,
            userName:    user.firstName
              ? `${user.firstName} ${user.lastName ?? ''}`.trim()
              : null,
            action:      meta.action,
            module:      meta.module,
            entityType:  meta.module,
            entityId,
            description,
            newData:     meta.captureBody ? req.body : undefined,
            ipAddress:   req.ip          ?? null,
            userAgent:   req.headers?.['user-agent'] ?? null,
          });
        } catch {
          // Never throw from interceptor
        }
      }),
    );
  }
}
