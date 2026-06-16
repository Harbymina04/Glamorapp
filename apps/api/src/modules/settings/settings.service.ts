import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { COUNTRY_PRESETS, getCountryPreset } from '../../common/constants/country-presets';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Catálogo de países disponibles con sus ajustes regionales. */
  getCountryPresets() {
    return COUNTRY_PRESETS;
  }

  /**
   * Aplica los ajustes regionales de un país a la sucursal: moneda, zona
   * horaria e idioma; y ajusta (o crea) el impuesto IVA por defecto del negocio
   * con el nombre y la tasa del país. No toca otros impuestos ni datos fiscales.
   */
  async applyCountry(tenantId: string, storeId: string, code: string) {
    const preset = getCountryPreset(code);

    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        country: preset.name,
        currency: preset.currency,
        timezone: preset.timezone,
        locale: preset.locale,
      },
    });

    // Impuesto IVA por defecto del tenant: actualizar el existente o crear uno
    const existing = await this.prisma.taxRate.findFirst({
      where: { tenantId, taxType: 'iva', isDefault: true },
    });
    if (existing) {
      await this.prisma.taxRate.update({
        where: { id: existing.id },
        data: { name: preset.taxName, rate: preset.taxRate },
      });
    } else {
      await this.prisma.taxRate.create({
        data: { tenantId, name: preset.taxName, taxType: 'iva', rate: preset.taxRate, isDefault: true, isActive: true },
      });
    }

    return { store, country: preset };
  }

  async getStore(tenantId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({ where: { id: storeId, tenantId } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async getPosConfig(tenantId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      select: { taxInclusive: true, allowDiscounts: true, currency: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async updateGeneral(tenantId: string, storeId: string, dto: any) {
    const { name, email, phone, address, city, state, country, zipCode, currency, timezone, locale, dateFormat, timeFormat, unitSystem, slogan } = dto;
    return this.prisma.store.update({
      where: { id: storeId },
      data: { name, email, phone, address, city, state, country, zipCode, currency, timezone, locale, dateFormat, timeFormat, unitSystem, slogan },
    });
  }

  async updateAppearance(tenantId: string, storeId: string, dto: any) {
    return this.prisma.store.update({
      where: { id: storeId },
      data: { primaryColor: dto.primaryColor, theme: dto.theme, logoUrl: dto.logoUrl },
    });
  }

  async updateSales(tenantId: string, storeId: string, dto: any) {
    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        taxInclusive: dto.taxInclusive, allowDiscounts: dto.allowDiscounts,
        autoPrintReceipt: dto.autoPrintReceipt, requireCustomerOnSale: dto.requireCustomerOnSale,
        lowStockAlert: dto.lowStockAlert, defaultPage: dto.defaultPage,
        sessionDurationMinutes: dto.sessionDurationMinutes, initialFolioNumber: dto.initialFolioNumber,
      },
    });
  }

  async updatePos(tenantId: string, storeId: string, dto: any) {
    const data: any = {};
    if (dto.invoiceTemplate !== undefined) data.invoiceTemplate = dto.invoiceTemplate;
    if (dto.ticketTemplate !== undefined) data.ticketTemplate = dto.ticketTemplate;
    if (dto.posSettings !== undefined) data.posSettings = dto.posSettings;
    return this.prisma.store.update({ where: { id: storeId }, data });
  }
}
