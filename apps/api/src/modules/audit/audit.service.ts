import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  tenantId: string;
  storeId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates an audit log entry — fire-and-forget (never throws).
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    this.prisma.auditLog
      .create({
        data: {
          tenantId:    dto.tenantId,
          storeId:     dto.storeId     ?? null,
          userId:      dto.userId      ?? null,
          userEmail:   dto.userEmail   ?? null,
          userName:    dto.userName    ?? null,
          action:      dto.action,
          module:      dto.module,
          entityType:  dto.entityType,
          entityId:    dto.entityId    ?? null,
          description: dto.description ?? null,
          oldData:     dto.oldData     ?? undefined,
          newData:     dto.newData     ?? undefined,
          ipAddress:   dto.ipAddress   ?? null,
          userAgent:   dto.userAgent   ?? null,
        },
      })
      .catch(err =>
        console.error('[AuditLog] Failed to write log:', err.message),
      );
  }

  // ── Queries ─────────────────────────────────────────────────

  async findLogs(filter: {
    tenantId?: string;
    storeId?: string;
    module?: string;
    userId?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = filter.page  ?? 1;
    const limit = filter.limit ?? 50;

    const where: any = {};

    if (filter.tenantId) where.tenantId = filter.tenantId;
    if (filter.storeId)  where.storeId  = filter.storeId;
    if (filter.module)   where.module   = filter.module;
    if (filter.userId)   where.userId   = filter.userId;
    if (filter.action)   where.action   = filter.action;

    if (filter.from || filter.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = new Date(filter.from);
      if (filter.to)   where.createdAt.lte = new Date(filter.to + 'T23:59:59');
    }

    if (filter.search) {
      where.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { userEmail:   { contains: filter.search, mode: 'insensitive' } },
        { userName:    { contains: filter.search, mode: 'insensitive' } },
        { entityId:    { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getModules(tenantId: string) {
    const result = await this.prisma.auditLog.findMany({
      where:   { tenantId },
      select:  { module: true },
      distinct: ['module'],
    });
    return result.map(r => r.module).sort();
  }
}
