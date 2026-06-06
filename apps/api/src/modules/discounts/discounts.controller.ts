import {
  Controller, Get, Post, Put, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';

@ApiTags('Discounts')
@Controller('discounts')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('pos')
@ApiBearerAuth()
export class DiscountsController {
  constructor(private service: DiscountsService) {}

  // ⚠️  /active MUST come before /:id so NestJS doesn't match "active" as an id param
  @Get('active')
  getActive(@TenantId() t: string, @StoreId() s: string) {
    return this.service.findActive(t, s);
  }

  @Get()
  findAll(
    @TenantId() t: string,
    @StoreId() s: string,
    @Query() q: PaginationDto & { isActive?: string; search?: string },
  ) {
    return this.service.findAll(t, s, q);
  }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.findOne(t, s, id);
  }

  @Post()
  create(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.service.create(t, s, dto, userId);
  }

  @Put(':id')
  update(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.service.update(t, s, id, dto);
  }

  @Patch(':id/toggle')
  toggle(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.toggle(t, s, id);
  }
}
