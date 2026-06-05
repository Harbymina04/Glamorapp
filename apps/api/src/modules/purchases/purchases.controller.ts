import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
} from './dto/purchase.dto';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class PurchasesController {
  constructor(private service: PurchasesService) {}

  // ===================================================================
  // CRUD
  // ===================================================================

  @Get()
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
  findOne(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(t, s, id);
  }

  @Post()
  create(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() d: CreatePurchaseDto,
  ) {
    return this.service.create(t, s, d, userId);
  }

  @Put(':id')
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
  receive(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() d: ReceivePurchaseDto,
  ) {
    return this.service.receive(t, s, id, d, userId);
  }

  @Post(':id/cancel')
  cancel(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(t, s, id);
  }
}
