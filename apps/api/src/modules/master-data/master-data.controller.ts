import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateMasterCategoryDto, UpdateMasterCategoryDto,
  CreateMasterBrandDto, UpdateMasterBrandDto,
  CreateCountryDto, UpdateCountryDto,
  CreateDepartmentDto, UpdateDepartmentDto,
  CreateCityDto, UpdateCityDto,
} from './dto/master-data.dto';

@ApiTags('Master Data')
@Controller('master-data')
export class MasterDataController {
  constructor(private service: MasterDataService) {}

  // ─── Endpoints públicos (solo lectura) ───────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías maestras (público)' })
  @ApiQuery({ name: 'type', required: false, enum: ['product', 'service', 'design', 'general', 'all'] })
  @ApiQuery({ name: 'lang', required: false })
  findCategories(
    @Query('type') type?: string,
    @Query('lang') lang = 'es',
  ) {
    return this.service.findAllCategories(type, lang);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Listar marcas maestras (público)' })
  @ApiQuery({ name: 'lang', required: false })
  findBrands(@Query('lang') lang = 'es') {
    return this.service.findAllBrands(lang);
  }

  @Get('countries')
  @ApiOperation({ summary: 'Listar países (público)' })
  @ApiQuery({ name: 'lang', required: false })
  findCountries(@Query('lang') lang = 'es') {
    return this.service.findAllCountries(lang);
  }

  @Get('countries/:isoCode/departments')
  @ApiOperation({ summary: 'Listar departamentos por país (público)' })
  @ApiQuery({ name: 'lang', required: false })
  findDepartments(
    @Param('isoCode') isoCode: string,
    @Query('lang') lang = 'es',
  ) {
    return this.service.findDepartmentsByCountry(isoCode, lang);
  }

  @Get('departments/:id/cities')
  @ApiOperation({ summary: 'Listar ciudades por departamento (público)' })
  @ApiQuery({ name: 'lang', required: false })
  findCities(
    @Param('id') id: string,
    @Query('lang') lang = 'es',
  ) {
    return this.service.findCitiesByDepartment(id, lang);
  }

  // ─── Endpoints de admin (superadmin) — solo lectura completa ─

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Listar todas las categorías' })
  adminListCategories() {
    return this.service.adminListCategories();
  }

  @Get('admin/brands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Listar todas las marcas' })
  adminListBrands() {
    return this.service.adminListBrands();
  }

  @Get('admin/countries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  adminListCountries() {
    return this.service.adminListCountries();
  }

  @Get('admin/departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @ApiQuery({ name: 'countryId', required: false })
  adminListDepartments(@Query('countryId') countryId?: string) {
    return this.service.adminListDepartments(countryId);
  }

  @Get('admin/cities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @ApiQuery({ name: 'departmentId', required: false })
  adminListCities(@Query('departmentId') departmentId?: string) {
    return this.service.adminListCities(departmentId);
  }

  // ─── CRUD Categorías (superadmin) ────────────────────────────

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  createCategory(@Body() dto: CreateMasterCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Put('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  updateCategory(@Param('id') id: string, @Body() dto: UpdateMasterCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // ─── CRUD Marcas (superadmin) ─────────────────────────────────

  @Post('admin/brands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  createBrand(@Body() dto: CreateMasterBrandDto) {
    return this.service.createBrand(dto);
  }

  @Put('admin/brands/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  updateBrand(@Param('id') id: string, @Body() dto: UpdateMasterBrandDto) {
    return this.service.updateBrand(id, dto);
  }

  @Delete('admin/brands/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBrand(@Param('id') id: string) {
    return this.service.deleteBrand(id);
  }

  // ─── CRUD Países (superadmin) ─────────────────────────────────

  @Post('admin/countries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  createCountry(@Body() dto: CreateCountryDto) {
    return this.service.createCountry(dto);
  }

  @Put('admin/countries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.service.updateCountry(id, dto);
  }

  // ─── CRUD Departamentos (superadmin) ──────────────────────────

  @Post('admin/departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(dto);
  }

  @Put('admin/departments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.updateDepartment(id, dto);
  }

  // ─── CRUD Ciudades (superadmin) ───────────────────────────────

  @Post('admin/cities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  createCity(@Body() dto: CreateCityDto) {
    return this.service.createCity(dto);
  }

  @Put('admin/cities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  @ApiBearerAuth()
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.service.updateCity(id, dto);
  }
}
