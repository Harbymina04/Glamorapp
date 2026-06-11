import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantCreateUserDto, TenantResetPasswordDto } from './dto/tenant-user.dto';

@ApiTags('Tenant Admin')
@SkipSubscriptionCheck()
@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_admin')
@ApiBearerAuth()
export class TenantController {
  constructor(private service: TenantService) {}

  // ═══ Dashboard ═══

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.tenantId);
  }

  // ═══ Stores ═══

  @Get('stores')
  async listStores(@Request() req: any) {
    return this.service.listStores(req.user.tenantId);
  }

  @Get('stores/:id')
  async getStore(@Request() req: any, @Param('id') id: string) {
    return this.service.getStore(req.user.tenantId, id);
  }

  @Post('stores')
  async createStore(@Request() req: any, @Body() dto: any) {
    return this.service.createStore(req.user.tenantId, dto);
  }

  @Put('stores/:id')
  async updateStore(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateStore(req.user.tenantId, id, dto);
  }

  @Put('stores/:id/toggle')
  async toggleStore(@Request() req: any, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.toggleStore(req.user.tenantId, id, isActive);
  }

  // ═══ Users ═══

  @Get('users')
  async listUsers(@Request() req: any, @Query('storeId') storeId?: string) {
    return this.service.listUsers(req.user.tenantId, storeId);
  }

  @Post('users')
  async createUser(@Request() req: any, @Body() dto: TenantCreateUserDto) {
    return this.service.createUser(req.user.tenantId, dto);
  }

  @Post('users/:id/reset-password')
  async resetPassword(@Request() req: any, @Param('id') id: string, @Body() dto: TenantResetPasswordDto) {
    return this.service.resetUserPassword(req.user.tenantId, id, dto.password);
  }

  @Put('users/:id/toggle')
  async toggleUser(@Request() req: any, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.toggleUser(req.user.tenantId, id, isActive);
  }

  // ═══ AI Usage ═══

  @Get('ai-usage')
  async getAiUsage(@Request() req: any) {
    return this.service.getAiUsage(req.user.tenantId);
  }

  // ═══ Marketing Integrations ═══

  @Get('marketing-config')
  async getMarketingConfig(@Request() req: any) {
    return this.service.getMarketingConfig(req.user.tenantId);
  }

  @Put('marketing-config')
  async updateMarketingConfig(@Request() req: any, @Body() config: any) {
    return this.service.updateMarketingConfig(req.user.tenantId, config);
  }
}
