import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

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
