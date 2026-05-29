import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // ===================================================================
  // Basic CRUD
  // ===================================================================

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 100);
    const where: any = {
      tenantId, storeId, deletedAt: null,
      ...(query.search ? { businessName: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.supplier.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 100);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const s = await this.prisma.supplier.findFirst({ where: { id, tenantId, storeId } });
    if (!s) throw new NotFoundException('Proveedor no encontrado');
    return s;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    const count = await this.prisma.supplier.count({ where: { tenantId, storeId } });
    const supplierNumber = `PROV-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.supplier.create({ data: { tenantId, storeId, supplierNumber, ...dto } });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, status: 'inactive' } });
  }

  // ===================================================================
  // Detail (ficha completa)
  // ===================================================================

  async getDetail(tenantId: string, storeId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, storeId },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    // Supplier products with price history
    const supplierProducts = await this.prisma.supplierProduct.findMany({
      where: { supplierId: id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 10 },
      },
      orderBy: { isPreferred: 'desc' },
    });

    // Transaction stats
    const purchaseStats = await this.prisma.purchase.aggregate({
      where: { tenantId, storeId, supplierId: id, status: { not: 'cancelled' } },
      _count: true,
      _sum: { total: true },
    });
    const lastPurchase = await this.prisma.purchase.findFirst({
      where: { tenantId, storeId, supplierId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, purchaseNumber: true },
    });

    return {
      ...supplier,
      supplierProducts,
      totalOrders: purchaseStats._count,
      totalSpent: purchaseStats._sum.total || 0,
      lastPurchaseAt: lastPurchase?.createdAt || null,
      lastPurchaseNumber: lastPurchase?.purchaseNumber || null,
    };
  }

  // ===================================================================
  // Transactions history
  // ===================================================================

  async getTransactions(tenantId: string, storeId: string, supplierId: string, query: any) {
    const limit = Math.min(query.limit || 50, 200);

    const purchases = await this.prisma.purchase.findMany({
      where: { tenantId, storeId, supplierId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, purchaseNumber: true, total: true, status: true,
        paymentStatus: true, createdAt: true,
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return purchases.map(p => ({
      type: 'purchase',
      id: p.id,
      date: p.createdAt,
      reference: p.purchaseNumber,
      amount: p.total,
      status: p.status,
      paymentStatus: p.paymentStatus,
      itemCount: p.items.length,
      items: p.items.map(i => i.product?.name || 'Producto'),
    }));
  }

  // ===================================================================
  // Contacts
  // ===================================================================

  async listContacts(tenantId: string, storeId: string, supplierId: string) {
    await this.findOne(tenantId, storeId, supplierId);
    return this.prisma.supplierContact.findMany({
      where: { tenantId, storeId, supplierId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async createContact(tenantId: string, storeId: string, supplierId: string, dto: any) {
    await this.findOne(tenantId, storeId, supplierId);
    // If this is primary, unset others
    if (dto.isPrimary) {
      await this.prisma.supplierContact.updateMany({
        where: { supplierId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.supplierContact.create({
      data: { tenantId, storeId, supplierId, ...dto },
    });
  }

  async updateContact(tenantId: string, storeId: string, contactId: string, dto: any) {
    const contact = await this.prisma.supplierContact.findFirst({
      where: { id: contactId, tenantId, storeId },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');

    if (dto.isPrimary) {
      await this.prisma.supplierContact.updateMany({
        where: { supplierId: contact.supplierId, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }
    return this.prisma.supplierContact.update({ where: { id: contactId }, data: dto });
  }

  async deleteContact(tenantId: string, storeId: string, contactId: string) {
    const contact = await this.prisma.supplierContact.findFirst({
      where: { id: contactId, tenantId, storeId },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    return this.prisma.supplierContact.delete({ where: { id: contactId } });
  }

  // ===================================================================
  // Documents
  // ===================================================================

  async listDocuments(tenantId: string, storeId: string, supplierId: string) {
    await this.findOne(tenantId, storeId, supplierId);
    return this.prisma.supplierDocument.findMany({
      where: { tenantId, storeId, supplierId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(tenantId: string, storeId: string, supplierId: string, dto: any) {
    await this.findOne(tenantId, storeId, supplierId);
    return this.prisma.supplierDocument.create({
      data: { tenantId, storeId, supplierId, ...dto },
    });
  }

  async deleteDocument(tenantId: string, storeId: string, docId: string) {
    const doc = await this.prisma.supplierDocument.findFirst({
      where: { id: docId, tenantId, storeId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return this.prisma.supplierDocument.delete({ where: { id: docId } });
  }

  // ===================================================================
  // Supplier Products & Price History
  // ===================================================================

  async listSupplierProducts(tenantId: string, storeId: string, supplierId: string) {
    await this.findOne(tenantId, storeId, supplierId);
    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        product: { select: { id: true, name: true, sku: true, salePrice: true } },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 5 },
      },
      orderBy: { isPreferred: 'desc' },
    });
  }

  async addSupplierProduct(tenantId: string, storeId: string, supplierId: string, dto: any) {
    await this.findOne(tenantId, storeId, supplierId);
    // Check product exists
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    // Check not duplicated
    const existing = await this.prisma.supplierProduct.findFirst({
      where: { supplierId, productId: dto.productId },
    });
    if (existing) throw new ConflictException('Este producto ya está asociado al proveedor');

    const sp = await this.prisma.supplierProduct.create({
      data: { supplierId, ...dto },
    });

    // Create initial price record
    if (dto.supplierPrice) {
      await this.prisma.supplierProductPrice.create({
        data: {
          supplierProductId: sp.id,
          price: dto.supplierPrice,
          reason: 'Precio inicial',
        },
      });

      // Auto-sync product costPrice if preferred and price was set
      if (dto.isPreferred) {
        await this.prisma.product.update({
          where: { id: dto.productId },
          data: { costPrice: dto.supplierPrice },
        });
      }
    }

    return this.prisma.supplierProduct.findUnique({
      where: { id: sp.id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 5 },
      },
    });
  }

  async updateSupplierProduct(tenantId: string, storeId: string, spId: string, dto: any) {
    const sp = await this.prisma.supplierProduct.findFirst({ where: { id: spId } });
    if (!sp) throw new NotFoundException('Producto de proveedor no encontrado');
    return this.prisma.supplierProduct.update({ where: { id: spId }, data: dto });
  }

  async removeSupplierProduct(tenantId: string, storeId: string, spId: string) {
    const sp = await this.prisma.supplierProduct.findFirst({ where: { id: spId } });
    if (!sp) throw new NotFoundException('Producto de proveedor no encontrado');
    return this.prisma.supplierProduct.delete({ where: { id: spId } });
  }

  async updateProductPrice(tenantId: string, storeId: string, spId: string, dto: any) {
    const sp = await this.prisma.supplierProduct.findFirst({ where: { id: spId } });
    if (!sp) throw new NotFoundException('Producto de proveedor no encontrado');
    if (!dto.newPrice || dto.newPrice <= 0) throw new BadRequestException('El precio debe ser mayor a 0');

    const previousPrice = sp.supplierPrice;

    // Create price history record
    await this.prisma.supplierProductPrice.create({
      data: {
        supplierProductId: spId,
        price: dto.newPrice,
        previousPrice: previousPrice,
        changedByUserId: dto.userId || null,
        reason: dto.reason || 'Actualización de precio',
        effectiveDate: new Date(),
      },
    });

    // Update current price
    const updated = await this.prisma.supplierProduct.update({
      where: { id: spId },
      data: { supplierPrice: dto.newPrice },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 5 },
      },
    });

    // Auto-sync product costPrice if this is the preferred supplier
    if (sp.isPreferred) {
      await this.prisma.product.update({
        where: { id: sp.productId },
        data: { costPrice: dto.newPrice },
      });
    }

    return updated;
  }

  async getPriceHistory(tenantId: string, storeId: string, spId: string) {
    const sp = await this.prisma.supplierProduct.findFirst({ where: { id: spId } });
    if (!sp) throw new NotFoundException('Producto de proveedor no encontrado');
    return this.prisma.supplierProductPrice.findMany({
      where: { supplierProductId: spId },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  // ===================================================================
  // Supplier comparison per product
  // ===================================================================

  async compareSuppliersForProduct(tenantId: string, storeId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, sku: true, salePrice: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const supplierProducts = await this.prisma.supplierProduct.findMany({
      where: { productId },
      include: {
        supplier: { select: { id: true, businessName: true, supplierNumber: true } },
        prices: { orderBy: { effectiveDate: 'desc' }, take: 1 },
      },
      orderBy: { supplierPrice: 'asc' },
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentSalePrice: product.salePrice,
      },
      suppliers: supplierProducts.map(sp => ({
        supplierProductId: sp.id,
        supplierId: sp.supplier.id,
        supplierName: sp.supplier.businessName,
        supplierNumber: sp.supplier.supplierNumber,
        supplierSku: sp.supplierSku,
        supplierPrice: sp.supplierPrice,
        isPreferred: sp.isPreferred,
        lastPriceChange: sp.prices[0]?.effectiveDate || null,
        margin: product.salePrice
          ? Number(((Number(product.salePrice) - Number(sp.supplierPrice || 0)) / Number(product.salePrice)) * 100).toFixed(1)
          : null,
      })),
    };
  }
}
