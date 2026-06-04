import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_KEY = 'audit_meta';

export interface AuditMeta {
  module: string;
  action: AuditAction;
  description?: string;           // static description, or template: "Venta {folio} completada"
  captureBody?: boolean;          // save request body as newData
  entityIdFrom?: 'param' | 'result' | 'body'; // where to extract entityId
  entityIdField?: string;         // which field (default: 'id')
}

/**
 * @Audit('sales', 'sale', 'Venta completada')
 * Marks a controller method to be audited after successful execution.
 */
export const Audit = (
  module: string,
  action: AuditAction,
  description?: string,
  options?: Partial<Pick<AuditMeta, 'captureBody' | 'entityIdFrom' | 'entityIdField'>>,
) =>
  SetMetadata(AUDIT_KEY, {
    module,
    action,
    description,
    captureBody: options?.captureBody ?? false,
    entityIdFrom: options?.entityIdFrom ?? 'result',
    entityIdField: options?.entityIdField ?? 'id',
  } as AuditMeta);
