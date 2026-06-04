import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// ── Shared query DTO ─────────────────────────────────────────────

interface AuditQuery {
  module?: string;
  userId?: string;
  action?: any;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Superadmin: all tenants ──────────────────────────────────────

@ApiTags('Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class AdminAuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Query() query: AuditQuery & { tenantId?: string; storeId?: string }) {
    return this.audit.findLogs({
      tenantId: query.tenantId,
      storeId:  query.storeId,
      module:   query.module,
      userId:   query.userId,
      action:   query.action,
      from:     query.from,
      to:       query.to,
      search:   query.search,
      page:     query.page  ? Number(query.page)  : 1,
      limit:    query.limit ? Number(query.limit) : 50,
    });
  }
}

// ── Tenant admin: own tenant ─────────────────────────────────────

@ApiTags('Audit Logs')
@Controller('tenant/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_admin')
@ApiBearerAuth()
export class TenantAuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Request() req: any, @Query() query: AuditQuery & { storeId?: string }) {
    return this.audit.findLogs({
      tenantId: req.user.tenantId,
      storeId:  query.storeId,
      module:   query.module,
      userId:   query.userId,
      action:   query.action,
      from:     query.from,
      to:       query.to,
      search:   query.search,
      page:     query.page  ? Number(query.page)  : 1,
      limit:    query.limit ? Number(query.limit) : 50,
    });
  }

  @Get('modules')
  getModules(@Request() req: any) {
    return this.audit.getModules(req.user.tenantId);
  }
}

// ── Store level: own store ───────────────────────────────────────

@ApiTags('Audit Logs')
@Controller('dashboard/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('store_admin', 'tenant_admin')
@ApiBearerAuth()
export class StoreAuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Request() req: any, @Query() query: AuditQuery) {
    return this.audit.findLogs({
      tenantId: req.user.tenantId,
      storeId:  req.user.storeId ?? undefined,
      module:   query.module,
      userId:   query.userId,
      action:   query.action,
      from:     query.from,
      to:       query.to,
      search:   query.search,
      page:     query.page  ? Number(query.page)  : 1,
      limit:    query.limit ? Number(query.limit) : 50,
    });
  }

  @Get('modules')
  getModules(@Request() req: any) {
    return this.audit.getModules(req.user.tenantId);
  }
}
