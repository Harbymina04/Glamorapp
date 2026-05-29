import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private service: SuppliersService) {}

  // ===================================================================
  // Basic CRUD
  // ===================================================================

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { search?: string; category?: string; status?: string }) {
    return this.service.findAll(t, s, q);
  }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }
  @Delete(':id') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.remove(t, s, id); }

  // ===================================================================
  // Detail & Transactions
  // ===================================================================

  @Get(':id/detail')
  getDetail(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.getDetail(t, s, id);
  }

  @Get(':id/transactions')
  getTransactions(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query() q: any) {
    return this.service.getTransactions(t, s, id, q);
  }

  // ===================================================================
  // Contacts
  // ===================================================================

  @Get(':supplierId/contacts')
  listContacts(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listContacts(t, s, supplierId);
  }

  @Post(':supplierId/contacts')
  createContact(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: any) {
    return this.service.createContact(t, s, supplierId, d);
  }

  @Put(':supplierId/contacts/:contactId')
  updateContact(@TenantId() t: string, @StoreId() s: string, @Param('contactId') contactId: string, @Body() d: any) {
    return this.service.updateContact(t, s, contactId, d);
  }

  @Delete(':supplierId/contacts/:contactId')
  deleteContact(@TenantId() t: string, @StoreId() s: string, @Param('contactId') contactId: string) {
    return this.service.deleteContact(t, s, contactId);
  }

  // ===================================================================
  // Documents
  // ===================================================================

  @Get(':supplierId/documents')
  listDocuments(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listDocuments(t, s, supplierId);
  }

  @Post(':supplierId/documents')
  addDocument(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: any) {
    return this.service.addDocument(t, s, supplierId, d);
  }

  @Delete(':supplierId/documents/:docId')
  deleteDocument(@TenantId() t: string, @StoreId() s: string, @Param('docId') docId: string) {
    return this.service.deleteDocument(t, s, docId);
  }

  // ===================================================================
  // Supplier Products
  // ===================================================================

  @Get(':supplierId/products')
  listSupplierProducts(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listSupplierProducts(t, s, supplierId);
  }

  @Post(':supplierId/products')
  addSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: any) {
    return this.service.addSupplierProduct(t, s, supplierId, d);
  }

  @Put(':supplierId/products/:spId')
  updateSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string, @Body() d: any) {
    return this.service.updateSupplierProduct(t, s, spId, d);
  }

  @Delete(':supplierId/products/:spId')
  removeSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string) {
    return this.service.removeSupplierProduct(t, s, spId);
  }

  @Put(':supplierId/products/:spId/price')
  updateProductPrice(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string, @Body() d: any) {
    return this.service.updateProductPrice(t, s, spId, d);
  }

  @Get(':supplierId/products/:spId/prices')
  getPriceHistory(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string) {
    return this.service.getPriceHistory(t, s, spId);
  }

  // ===================================================================
  // Comparison
  // ===================================================================

  @Get('compare/product/:productId')
  compareSuppliers(@TenantId() t: string, @StoreId() s: string, @Param('productId') productId: string) {
    return this.service.compareSuppliersForProduct(t, s, productId);
  }
}
