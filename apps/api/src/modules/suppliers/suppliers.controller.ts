import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';
import {
  CreateSupplierDto, UpdateSupplierDto, SupplierContactDto, SupplierDocumentDto,
  AddSupplierProductDto, UpdateSupplierProductDto, UpdateSupplierPriceDto,
} from './dto/supplier.dto';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('suppliers')
@ApiBearerAuth()
export class SuppliersController {
  constructor(private service: SuppliersService) {}

  // ===================================================================
  // Basic CRUD
  // ===================================================================

  @Get()
  @RequireScope('suppliers', 'view')
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { search?: string; category?: string; status?: string }) {
    return this.service.findAll(t, s, q);
  }

  @Get(':id')
  @RequireScope('suppliers', 'view')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Post() @RequireScope('suppliers', 'create') create(@TenantId() t: string, @StoreId() s: string, @Body() d: CreateSupplierDto) { return this.service.create(t, s, d); }
  @Put(':id') @RequireScope('suppliers', 'edit') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: UpdateSupplierDto) { return this.service.update(t, s, id, d); }
  @Delete(':id') @RequireScope('suppliers', 'delete') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.remove(t, s, id); }

  // ===================================================================
  // Detail & Transactions
  // ===================================================================

  @Get(':id/detail')
  @RequireScope('suppliers', 'view')
  getDetail(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.getDetail(t, s, id);
  }

  @Get(':id/transactions')
  @RequireScope('suppliers', 'view')
  getTransactions(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query() q: any) {
    return this.service.getTransactions(t, s, id, q);
  }

  // ===================================================================
  // Contacts
  // ===================================================================

  @Get(':supplierId/contacts')
  @RequireScope('suppliers', 'view')
  listContacts(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listContacts(t, s, supplierId);
  }

  @Post(':supplierId/contacts')
  @RequireScope('suppliers', 'create')
  createContact(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: SupplierContactDto) {
    return this.service.createContact(t, s, supplierId, d);
  }

  @Put(':supplierId/contacts/:contactId')
  @RequireScope('suppliers', 'edit')
  updateContact(@TenantId() t: string, @StoreId() s: string, @Param('contactId') contactId: string, @Body() d: SupplierContactDto) {
    return this.service.updateContact(t, s, contactId, d);
  }

  @Delete(':supplierId/contacts/:contactId')
  @RequireScope('suppliers', 'edit')
  deleteContact(@TenantId() t: string, @StoreId() s: string, @Param('contactId') contactId: string) {
    return this.service.deleteContact(t, s, contactId);
  }

  // ===================================================================
  // Documents
  // ===================================================================

  @Get(':supplierId/documents')
  @RequireScope('suppliers', 'view')
  listDocuments(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listDocuments(t, s, supplierId);
  }

  @Post(':supplierId/documents')
  @RequireScope('suppliers', 'create')
  addDocument(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: SupplierDocumentDto) {
    return this.service.addDocument(t, s, supplierId, d);
  }

  @Delete(':supplierId/documents/:docId')
  @RequireScope('suppliers', 'edit')
  deleteDocument(@TenantId() t: string, @StoreId() s: string, @Param('docId') docId: string) {
    return this.service.deleteDocument(t, s, docId);
  }

  // ===================================================================
  // Supplier Products
  // ===================================================================

  @Get(':supplierId/products')
  @RequireScope('suppliers', 'view')
  listSupplierProducts(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string) {
    return this.service.listSupplierProducts(t, s, supplierId);
  }

  @Post(':supplierId/products')
  @RequireScope('suppliers', 'create')
  addSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('supplierId') supplierId: string, @Body() d: AddSupplierProductDto) {
    return this.service.addSupplierProduct(t, s, supplierId, d);
  }

  @Put(':supplierId/products/:spId')
  @RequireScope('suppliers', 'edit')
  updateSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string, @Body() d: UpdateSupplierProductDto) {
    return this.service.updateSupplierProduct(t, s, spId, d);
  }

  @Delete(':supplierId/products/:spId')
  @RequireScope('suppliers', 'edit')
  removeSupplierProduct(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string) {
    return this.service.removeSupplierProduct(t, s, spId);
  }

  @Put(':supplierId/products/:spId/price')
  @RequireScope('suppliers', 'edit')
  updateProductPrice(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string, @CurrentUser('id') userId: string, @Body() d: UpdateSupplierPriceDto) {
    return this.service.updateProductPrice(t, s, spId, d, userId);
  }

  @Get(':supplierId/products/:spId/prices')
  @RequireScope('suppliers', 'view')
  getPriceHistory(@TenantId() t: string, @StoreId() s: string, @Param('spId') spId: string) {
    return this.service.getPriceHistory(t, s, spId);
  }

  // ===================================================================
  // Comparison
  // ===================================================================

  @Get('compare/product/:productId')
  @RequireScope('suppliers', 'view')
  compareSuppliers(@TenantId() t: string, @StoreId() s: string, @Param('productId') productId: string) {
    return this.service.compareSuppliersForProduct(t, s, productId);
  }
}
