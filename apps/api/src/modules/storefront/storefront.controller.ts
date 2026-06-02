import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private service: StorefrontService) {}

  // ── Public (no auth) ─────────────────────────────────────
  @Get('public')
  @ApiOperation({ summary: 'List active storefronts (public)' })
  getPublic(@Query() query: any) {
    return this.service.getPublicStorefronts(query);
  }

  @Get('public/products')
  @ApiOperation({ summary: 'Get all visible products across storefronts (public)' })
  getPublicProducts(@Query() query: any) {
    return this.service.getPublicProducts(query);
  }

  @Get('public/products/:id')
  @ApiOperation({ summary: 'Get single visible product by id (public)' })
  getPublicProduct(@Param('id') id: string) {
    return this.service.getPublicProduct(id);
  }

  @Get('public/services')
  getPublicServices(@Query() query: any) {
    return this.service.getPublicServices(query);
  }

  @Get('public/designs')
  getPublicDesigns(@Query() query: any) {
    return this.service.getPublicNailDesigns(query);
  }

  @Get('public/:slug')
  getPublicStorefront(@Param('slug') slug: string) {
    return this.service.getPublicStorefront(slug);
  }

  @Get('public/locations/:tenantId')
  getPublicLocations(@Param('tenantId') tenantId: string) {
    return this.service.getPublicLocations(tenantId);
  }

  @Post('public/orders')
  @HttpCode(HttpStatus.CREATED)
  createPublicOrder(@Body() dto: any) {
    return this.service.createOrder(dto);
  }

  @Post('public/reviews')
  @HttpCode(HttpStatus.CREATED)
  createPublicReview(@Body() dto: any) {
    return this.service.createReview(dto);
  }

  // ── Admin (auth required) ────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get()
  getStorefront(@Request() req: any) {
    return this.service.getStorefront(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Put()
  upsertStorefront(@Request() req: any, @Body() dto: any) {
    return this.service.upsertStorefront(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activate(@Request() req: any) {
    return this.service.activateStorefront(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Request() req: any) {
    return this.service.deactivateStorefront(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('stats')
  stats(@Request() req: any) {
    return this.service.getStorefrontStats(req.user.tenantId, req.user.storeId);
  }

  // Products
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('products')
  getProducts(@Request() req: any, @Query() query: any) {
    return this.service.getStoreProducts(req.user.tenantId, req.user.storeId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Put('products/bulk-visibility')
  bulkToggle(
    @Request() req: any,
    @Body() body: { productIds: string[]; isStoreVisible: boolean },
  ) {
    return this.service.bulkToggleProducts(req.user.tenantId, body.productIds, body.isStoreVisible);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Put('products/:id/visibility')
  toggleProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { isStoreVisible: boolean },
  ) {
    return this.service.toggleProductVisibility(
      req.user.tenantId,
      req.user.storeId,
      id,
      body.isStoreVisible,
    );
  }

  // Services
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('services')
  getServices(@Request() req: any) {
    return this.service.getStoreServices(req.user.tenantId, req.user.storeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Put('services/:id/visibility')
  toggleService(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.toggleServiceVisibility(
      req.user.tenantId,
      req.user.storeId,
      id,
      body,
    );
  }

  // Locations
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('locations')
  getLocations(@Request() req: any) {
    return this.service.getStoreLocations(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Put('locations/:storeId')
  updateLocation(
    @Request() req: any,
    @Param('storeId') storeId: string,
    @Body() dto: any,
  ) {
    return this.service.updateStoreVisibility(req.user.tenantId, storeId, dto);
  }

  // Orders
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('orders')
  getOrders(@Request() req: any, @Query() query: any) {
    return this.service.getOrders(req.user.tenantId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('orders/:id')
  getOrder(@Request() req: any, @Param('id') id: string) {
    return this.service.getOrder(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.updateOrderStatus(req.user.tenantId, id, body.status);
  }

  // Reviews
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Get('reviews')
  getReviews(@Request() req: any, @Query() query: any) {
    return this.service.getReviews(req.user.tenantId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'tenant_admin', 'store_admin')
  @ApiBearerAuth()
  @Post('reviews/:id/reply')
  @HttpCode(HttpStatus.OK)
  reply(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reply: string },
  ) {
    return this.service.replyToReview(req.user.tenantId, id, body.reply);
  }
}
