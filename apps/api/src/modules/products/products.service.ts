import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId,
      storeId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, storeId },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantId: string, storeId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { tenantId, storeId, ...dto },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
  }

  async update(tenantId: string, storeId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
  }

  async getCategories(tenantId: string, storeId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, storeId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getBrands(tenantId: string, storeId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, storeId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Product Images ─────────────────────────────────────────────

  async addImages(
    productId: string,
    files: { url: string; filename: string; size: number; mimeType: string }[],
  ) {
    // Get current max sort order
    const maxSort = await this.prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const images = await Promise.all(
      files.map((f) =>
        this.prisma.productImage.create({
          data: {
            productId,
            url: f.url,
            filename: f.filename,
            sortOrder: nextSort++,
          },
        }),
      ),
    );
    return images;
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    // Delete file from disk
    await this.storage.deleteFile(image.url);

    // Delete from DB
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async reorderImages(productId: string, imageIds: string[]) {
    // Update sort order for each image in the order given
    const updates = imageIds.map((id, index) =>
      this.prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    return Promise.all(updates);
  }

  // ─── Product Suppliers ─────────────────────────────────────────

  async getProductSuppliers(tenantId: string, storeId: string, productId: string) {
    await this.findOne(tenantId, storeId, productId);

    const supplierProducts = await this.prisma.supplierProduct.findMany({
      where: { productId },
      include: {
        supplier: {
          select: { id: true, businessName: true, supplierNumber: true },
        },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 1 },
      },
      orderBy: { supplierPrice: 'asc' },
    });

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { salePrice: true, costPrice: true },
    });

    return supplierProducts.map(sp => ({
      supplierProductId: sp.id,
      supplierId: sp.supplier.id,
      supplierName: sp.supplier.businessName,
      supplierNumber: sp.supplier.supplierNumber,
      supplierSku: sp.supplierSku,
      supplierPrice: sp.supplierPrice,
      isPreferred: sp.isPreferred,
      lastPriceChange: sp.prices[0]?.effectiveDate || null,
      margin: product?.salePrice && sp.supplierPrice
        ? Number(((Number(product.salePrice) - Number(sp.supplierPrice)) / Number(product.salePrice)) * 100).toFixed(1)
        : null,
    }));
  }

  // ─── Product Inventory Movements ──────────────────────────────

  async getProductMovements(tenantId: string, storeId: string, productId: string, query: any) {
    await this.findOne(tenantId, storeId, productId);
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { tenantId, productId, storeId },
        skip,
        take,
        include: {
          product: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where: { tenantId, productId, storeId } }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }
}
