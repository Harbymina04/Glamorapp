import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, avatarUrl: true, lastLoginAt: true, commissionRate: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { permissions: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role:           dto.role || 'cashier',
        commissionRate: dto.commissionRate ?? 0,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, commissionRate: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(tenantId, id);
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    return this.prisma.user.update({
      where: { id, tenantId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.user.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async updatePermissions(tenantId: string, userId: string, permissions: any[]) {
    await this.findOne(tenantId, userId);
    await this.prisma.permission.deleteMany({ where: { userId, tenantId } });
    if (permissions.length > 0) {
      await this.prisma.permission.createMany({
        data: permissions.map((p: any) => ({
          tenantId,
          userId,
          module: p.module,
          canView: p.canView ?? false,
          canCreate: p.canCreate ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          canExport: p.canExport ?? false,
        })),
      });
    }
    return this.findOne(tenantId, userId);
  }
}
