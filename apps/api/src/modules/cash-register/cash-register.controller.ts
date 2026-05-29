import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CashRegisterService } from './cash-register.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cash Register')
@Controller('cash-register')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CashRegisterController {
  constructor(private service: CashRegisterService) {}

  @Get('session/active')
  getActiveSession(@TenantId() t: string, @StoreId() s: string) {
    return this.service.getActiveSession(t, s);
  }

  @Get('sessions')
  getAllSessions(@TenantId() t: string, @StoreId() s: string, @Query() q: any) {
    return this.service.getAllSessions(t, s, q);
  }

  @Post('session/open')
  openSession(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() d: any,
  ) {
    return this.service.openSession(t, s, userId, d);
  }

  @Post('session/close')
  closeSession(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() d: any,
  ) {
    return this.service.closeSession(t, s, userId, d);
  }

  @Post('movement')
  addMovement(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() d: any,
  ) {
    return this.service.addMovement(t, s, userId, d);
  }

  @Get('movements/:sessionId')
  getMovements(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getSessionMovements(t, s, sessionId);
  }

  @Get('reconciliation')
  getReconciliation(@TenantId() t: string, @StoreId() s: string) {
    return this.service.getReconciliation(t, s);
  }

  // ─── Cash Register CRUD ────────────────────────────────

  @Get('registers')
  getRegisters(@TenantId() t: string, @StoreId() s: string) {
    return this.service.getRegisters(t, s);
  }

  @Post('registers')
  createRegister(@TenantId() t: string, @StoreId() s: string, @Body() d: any) {
    return this.service.createRegister(t, s, d);
  }

  @Put('registers/:id')
  updateRegister(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @Body() d: any,
  ) {
    return this.service.updateRegister(t, s, id, d);
  }

  @Delete('registers/:id')
  removeRegister(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
  ) {
    return this.service.removeRegister(t, s, id);
  }
}
