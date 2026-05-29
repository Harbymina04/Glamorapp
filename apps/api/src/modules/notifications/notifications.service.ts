import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const where: any = {
      tenantId,
      OR: [{ userId }, { userId: null }],
      ...(query.isRead !== undefined ? { isRead: query.isRead === 'true' } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async unreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { tenantId, OR: [{ userId }, { userId: null }], isRead: false },
    });
    return { count };
  }

  async create(data: any) {
    return this.prisma.notification.create({ data });
  }
}
