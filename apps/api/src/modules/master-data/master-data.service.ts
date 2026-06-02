import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMasterCategoryDto, UpdateMasterCategoryDto,
  CreateMasterBrandDto, UpdateMasterBrandDto,
  CreateCountryDto, UpdateCountryDto,
  CreateDepartmentDto, UpdateDepartmentDto,
  CreateCityDto, UpdateCityDto,
} from './dto/master-data.dto';

@Injectable()
export class MasterDataService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: apply i18n translation ─────────────────────────

  private translate(item: any, lang = 'es') {
    const t = item.translations as Record<string, string> | null;
    return {
      ...item,
      name: (t && t[lang]) || item.name,
    };
  }

  // ─── Categories ──────────────────────────────────────────────

  async findAllCategories(type?: string, lang = 'es', activeOnly = true) {
    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (type && type !== 'all') where.type = type;

    const items = await this.prisma.masterCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map(i => this.translate(i, lang));
  }

  async createCategory(dto: CreateMasterCategoryDto) {
    return this.prisma.masterCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateMasterCategoryDto) {
    await this.findCategoryOrThrow(id);
    return this.prisma.masterCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.findCategoryOrThrow(id);
    return this.prisma.masterCategory.delete({ where: { id } });
  }

  private async findCategoryOrThrow(id: string) {
    const item = await this.prisma.masterCategory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Categoría no encontrada');
    return item;
  }

  // ─── Brands ──────────────────────────────────────────────────

  async findAllBrands(lang = 'es', activeOnly = true) {
    const where: any = activeOnly ? { isActive: true } : {};
    const items = await this.prisma.masterBrand.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return items.map(i => this.translate(i, lang));
  }

  async createBrand(dto: CreateMasterBrandDto) {
    return this.prisma.masterBrand.create({ data: dto });
  }

  async updateBrand(id: string, dto: UpdateMasterBrandDto) {
    await this.findBrandOrThrow(id);
    return this.prisma.masterBrand.update({ where: { id }, data: dto });
  }

  async deleteBrand(id: string) {
    await this.findBrandOrThrow(id);
    return this.prisma.masterBrand.delete({ where: { id } });
  }

  private async findBrandOrThrow(id: string) {
    const item = await this.prisma.masterBrand.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Marca no encontrada');
    return item;
  }

  // ─── Countries ───────────────────────────────────────────────

  async findAllCountries(lang = 'es') {
    const items = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map(i => this.translate(i, lang));
  }

  async createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    await this.findCountryOrThrow(id);
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  private async findCountryOrThrow(id: string) {
    const item = await this.prisma.country.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('País no encontrado');
    return item;
  }

  // ─── Departments ─────────────────────────────────────────────

  async findDepartmentsByCountry(isoCode: string, lang = 'es') {
    const country = await this.prisma.country.findUnique({ where: { isoCode } });
    if (!country) throw new NotFoundException('País no encontrado');

    const items = await this.prisma.department.findMany({
      where: { countryId: country.id },
      orderBy: { name: 'asc' },
    });
    return items.map(i => this.translate(i, lang));
  }

  async createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const item = await this.prisma.department.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Departamento no encontrado');
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  // ─── Cities ──────────────────────────────────────────────────

  async findCitiesByDepartment(departmentId: string, lang = 'es') {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException('Departamento no encontrado');

    const items = await this.prisma.city.findMany({
      where: { departmentId },
      orderBy: { name: 'asc' },
    });
    return items.map(i => this.translate(i, lang));
  }

  async createCity(dto: CreateCityDto) {
    return this.prisma.city.create({ data: dto });
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    const item = await this.prisma.city.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Ciudad no encontrada');
    return this.prisma.city.update({ where: { id }, data: dto });
  }

  // ─── Admin: list all for management ─────────────────────────

  async adminListCategories() {
    return this.prisma.masterCategory.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async adminListBrands() {
    return this.prisma.masterBrand.findMany({ orderBy: { name: 'asc' } });
  }

  async adminListCountries() {
    return this.prisma.country.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async adminListDepartments(countryId?: string) {
    const where = countryId ? { countryId } : {};
    return this.prisma.department.findMany({
      where,
      include: { country: { select: { isoCode: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async adminListCities(departmentId?: string) {
    const where = departmentId ? { departmentId } : {};
    return this.prisma.city.findMany({
      where,
      include: { department: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: departmentId ? 1000 : 50,
    });
  }
}
