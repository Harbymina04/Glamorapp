import { Controller, Get, Post, Body, Query, Request, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommissionsController {
  constructor(private service: CommissionsService) {}

  @Get()
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiOperation({ summary: 'List commissions — scoped by role' })
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, req.user.storeId, req.user.role, query);
  }

  @Get('summary')
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiOperation({ summary: 'Commission summary per collaborator' })
  getSummary(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to')   to?:   string,
  ) {
    return this.service.getSummary(req.user.tenantId, req.user.storeId, req.user.role, from, to);
  }

  @Get('my')
  @Roles('superadmin', 'tenant_admin', 'store_admin', 'cashier')
  @ApiOperation({ summary: 'Get own commission history' })
  getMyCommissions(@Request() req: any, @Query() query: any) {
    return this.service.getUserCommissions(req.user.tenantId, req.user.sub, query);
  }

  @Get('user/:userId')
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiOperation({ summary: 'Get commission detail for a specific user' })
  getUserCommissions(@Request() req: any, @Param('userId') userId: string, @Query() query: any) {
    return this.service.getUserCommissions(req.user.tenantId, userId, query);
  }

  @Post('pay')
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiOperation({ summary: 'Mark commissions as paid' })
  payCommissions(@Request() req: any, @Body() dto: any) {
    return this.service.payCommissions(req.user.tenantId, req.user.sub, dto);
  }
}
