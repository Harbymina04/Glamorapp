import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
  MarkPaidDto,
} from './dto/purchase.dto';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';

@ApiTags('Purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('purchases')
@ApiBearerAuth()
export class PurchasesController {
  constructor(private service: PurchasesService) {}

  // ===================================================================
  // CRUD
  // ===================================================================

  @Get()
  @RequireScope('purchases', 'view')
  findAll(
    @TenantId() t: string,
    @StoreId() s: string,
    @Query()
    q: PaginationDto & {
      supplierId?: string;
      status?: string;
      paymentStatus?: string;
      search?: string;
    },
  ) {
    return this.service.findAll(t, s, q);
  }

  @Get(':id')
  @RequireScope('purchases', 'view')
  findOne(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(t, s, id);
  }

  @Post()
  @RequireScope('purchases', 'create')
  create(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() d: CreatePurchaseDto,
  ) {
    return this.service.create(t, s, d, userId);
  }

  @Put(':id')
  @RequireScope('purchases', 'edit')
  update(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @Body() d: UpdatePurchaseDto,
  ) {
    return this.service.update(t, s, id, d);
  }

  // ===================================================================
  // Receiving & Cancel
  // ===================================================================

  @Post(':id/receive')
  @RequireScope('purchases', 'edit')
  receive(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() d: ReceivePurchaseDto,
  ) {
    return this.service.receive(t, s, id, d, userId);
  }

  @Patch(':id/mark-paid')
  @RequireScope('purchases', 'edit')
  markAsPaid(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() d: MarkPaidDto,
  ) {
    return this.service.markAsPaid(t, s, id, d, userId);
  }

  @Post(':id/cancel')
  @RequireScope('purchases', 'edit')
  cancel(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(t, s, id);
  }
}
