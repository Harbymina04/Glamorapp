import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import { UserRole } from '@prisma/client';
import { BCRYPT_ROUNDS } from '../../common/constants/security';

/**
 * Roles que cada rol puede asignar al crear/editar usuarios.
 * Previene escalación de privilegios (p. ej. que un store_admin se cree
 * un superadmin o tenant_admin). superadmin y customer nunca son
 * asignables a través de este endpoint multi-tenant.
 */
const ASSIGNABLE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  tenant_admin: ['tenant_admin', 'store_admin', 'cashier', 'professional', 'financial', 'readonly'],
  store_admin: ['cashier', 'professional', 'financial', 'readonly'],
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Lanza si actorRole no puede asignar targetRole. */
  private assertCanAssignRole(actorRole: string, targetRole?: UserRole) {
    if (!targetRole) return;
    const allowed = ASSIGNABLE_ROLES[actorRole as UserRole] ?? [];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(`No tienes permiso para asignar el rol "${targetRole}".`);
    }
  }

  async findAll(tenantId: string, query: any, storeId?: string | null) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(storeId ? { storeId } : {}),
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

  async create(tenantId: string, dto: CreateUserDto, actorRole: string) {
    // Prevent privilege escalation via the role field
    this.assertCanAssignRole(actorRole, dto.role ?? ('cashier' as UserRole));

    // Validate plan user limit
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      const maxUsers = (sub.plan.features as any)?.limits?.maxUsers ?? sub.plan.maxUsers;
      const currentCount = await this.prisma.user.count({ where: { tenantId, deletedAt: null } });
      if (currentCount >= maxUsers) {
        throw new BadRequestException(`Límite de usuarios alcanzado (${maxUsers}). Actualiza tu plan.`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
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

  async update(tenantId: string, id: string, dto: UpdateUserDto, actorRole: string) {
    const target = await this.findOne(tenantId, id);

    // Can't edit a user whose current role is above what the actor may assign
    this.assertCanAssignRole(actorRole, target.role);
    // Can't promote the user into a role the actor may not assign
    this.assertCanAssignRole(actorRole, dto.role);

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
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
