import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Catalog')
@Controller('catalog')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CatalogController {
  constructor(private service: CatalogService) {}

  @Get('products')
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { categoryId?: string; brandId?: string; isFeatured?: string; search?: string }) {
    return this.service.getProducts(t, s, q);
  }

  @Put('products/:id/toggle-visibility')
  toggleVisibility(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.toggleVisibility(t, s, id); }

  @Put('products/:id/toggle-featured')
  toggleFeatured(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.toggleFeatured(t, s, id); }
}
