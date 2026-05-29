import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId, storeId, isVoided: false,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({ where, skip, take, include: { category: true }, orderBy: { expenseDate: 'desc' } }),
      this.prisma.expense.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const e = await this.prisma.expense.findFirst({ where: { id, tenantId, storeId }, include: { category: true } });
    if (!e) throw new NotFoundException('Expense not found');
    return e;
  }

  async create(tenantId: string, storeId: string, userId: string, dto: any) {
    return this.prisma.expense.create({ data: { tenantId, storeId, createdBy: userId, ...dto } });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async void(tenantId: string, storeId: string, id: string, reason: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.expense.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidedReason: reason } });
  }

  async getSummary(tenantId: string, storeId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await this.prisma.expense.aggregate({
      where: { tenantId, storeId, isVoided: false, expenseDate: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    });
    return { monthTotal: result._sum.amount || 0, count: result._count };
  }

  async getCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({ where: { tenantId, isActive: true } });
  }

  async createCategory(tenantId: string, dto: any) {
    return this.prisma.expenseCategory.create({ data: { tenantId, ...dto } });
  }
}
