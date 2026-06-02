import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFiles, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StorageService } from '../../storage/storage.service';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private storage: StorageService,
  ) {}

  @Get('categories/list')
  getCategories(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.productsService.getCategories(tenantId, storeId);
  }

  @Get('brands/list')
  getBrands(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.productsService.getBrands(tenantId, storeId);
  }

  @Post('categories/from-master')
  @HttpCode(HttpStatus.OK)
  createCategoryFromMaster(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Body() body: { masterId: string },
  ) {
    return this.productsService.createCategoryFromMaster(tenantId, storeId, body.masterId);
  }

  @Post('brands/from-master')
  @HttpCode(HttpStatus.OK)
  createBrandFromMaster(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Body() body: { masterId: string },
  ) {
    return this.productsService.createBrandFromMaster(tenantId, storeId, body.masterId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto & { search?: string; categoryId?: string; brandId?: string; status?: string },
  ) {
    return this.productsService.findAll(tenantId, storeId, query);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, storeId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @StoreId() storeId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, storeId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(tenantId, storeId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, storeId, id);
  }

  // ─── Product Images ───────────────────────────────────────────

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10, {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Only image files allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadProductImages(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images uploaded');
    }
    // Verify product exists
    await this.productsService.findOne(tenantId, storeId, productId);

    const savedFiles = await Promise.all(
      files.map((f) => this.storage.saveFile(f, 'products')),
    );

    const images = await this.productsService.addImages(productId, savedFiles);
    return { images };
  }

  @Delete(':id/images/:imageId')
  async removeProductImage(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.productsService.findOne(tenantId, storeId, productId);
    return this.productsService.removeImage(productId, imageId);
  }

  @Put(':id/images/reorder')
  async reorderProductImages(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') productId: string,
    @Body() body: { imageIds: string[] },
  ) {
    await this.productsService.findOne(tenantId, storeId, productId);
    return this.productsService.reorderImages(productId, body.imageIds);
  }

  // ─── Product Suppliers ────────────────────────────────────────

  @Get(':id/suppliers')
  getProductSuppliers(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.getProductSuppliers(tenantId, storeId, id);
  }

  // ─── Product Inventory Movements ──────────────────────────────

  @Get(':id/movements')
  getProductMovements(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ) {
    return this.productsService.getProductMovements(tenantId, storeId, id, query);
  }

  @Post(':id/link-image')
  async linkImage(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') productId: string,
    @Body() body: { url: string; filename: string },
  ) {
    await this.productsService.findOne(tenantId, storeId, productId);
    return this.productsService.addImages(productId, [{
      url: body.url,
      filename: body.filename,
      size: 0,
      mimeType: 'image/*',
    }]);
  }
}
