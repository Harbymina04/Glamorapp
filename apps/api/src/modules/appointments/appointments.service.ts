import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {}

  async findAll(tenantId: string, storeId: string, query: any, user?: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 100);
    const where: any = {
      tenantId, storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };

    // Role-based filtering: professionals only see their own appointments
    if (user?.role === 'professional') {
      where.professionalId = user.id;
    } else if (query.professionalId) {
      // Admin can filter by specific professional
      where.professionalId = query.professionalId;
    }

    // Date filtering: single date OR date range (startDate/endDate)
    if (query.date) {
      where.date = new Date(query.date);
    } else if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where, skip, take,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          professional: { select: { id: true, firstName: true } },
          service: true,
          nailDesign: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 100);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const a = await this.prisma.appointment.findFirst({
      where: { id, tenantId, storeId },
      include: { customer: true, professional: { select: { id: true, firstName: true, lastName: true } }, service: true, nailDesign: true },
    });
    if (!a) throw new NotFoundException('Appointment not found');
    return a;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    // Validate no time conflicts
    await this.checkOverlap(tenantId, storeId, dto.professionalId, dto.date, dto.startTime, dto.endTime);

    const appointment = await this.prisma.appointment.create({
      data: { tenantId, storeId, ...dto, date: new Date(dto.date) },
      include: { customer: true, service: true, professional: { select: { id: true, firstName: true } } },
    });

    // Send WhatsApp notification
    if (appointment.customer?.phone) {
      this.whatsapp.sendAppointmentCreated(storeId, {
        customerName: appointment.customer.firstName,
        customerPhone: appointment.customer.phone,
        serviceName: appointment.service?.name || 'Servicio',
        date: dto.date,
        time: dto.startTime,
        professionalName: appointment.professional?.firstName || 'Profesional',
        price: Number(appointment.price),
      }).catch(err => console.error('WhatsApp notification failed:', err.message));
    }

    return appointment;
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);

    // Validate no time conflicts
    if (dto.date || dto.startTime || dto.endTime || dto.professionalId) {
      const existing = await this.prisma.appointment.findUnique({ where: { id, tenantId, storeId }, select: { date: true, startTime: true, endTime: true, professionalId: true } });
      const date = dto.date || String(existing!.date).split('T')[0];
      const startTime = dto.startTime || existing!.startTime;
      const endTime = dto.endTime || existing!.endTime;
      const professionalId = dto.professionalId || existing!.professionalId;
      await this.checkOverlap(tenantId, storeId, professionalId, date, startTime, endTime, id);
    }

    return this.prisma.appointment.update({ where: { id, tenantId, storeId }, data: dto });
  }

  async updateStatus(tenantId: string, storeId: string, id: string, status: string, reason?: string) {
    const a = await this.findOne(tenantId, storeId, id);
    const updates: any = { status };
    if (status === 'confirmed') updates.confirmedAt = new Date();
    if (status === 'completed') updates.completedAt = new Date();
    if (status === 'cancelled') { updates.cancelledAt = new Date(); updates.cancelReason = reason; }

    const updated = await this.prisma.appointment.update({ where: { id, tenantId, storeId }, data: updates,
      include: { customer: true, service: true, professional: { select: { id: true, firstName: true } } },
    });

    // Send WhatsApp notification based on status change
    if (updated.customer?.phone) {
      if (status === 'confirmed') {
        this.whatsapp.sendAppointmentConfirmed(storeId, {
          customerName: updated.customer.firstName,
          customerPhone: updated.customer.phone,
          serviceName: updated.service?.name || 'Servicio',
          date: String(updated.date),
          time: updated.startTime,
        }).catch(err => console.error('WhatsApp confirm notification failed:', err.message));
      } else if (status === 'cancelled') {
        this.whatsapp.sendAppointmentCancelled(storeId, {
          customerName: updated.customer.firstName,
          customerPhone: updated.customer.phone,
          serviceName: updated.service?.name || 'Servicio',
          date: String(updated.date),
          time: updated.startTime,
          reason,
        }).catch(err => console.error('WhatsApp cancel notification failed:', err.message));
      }
    }

    return updated;
  }

  private async checkOverlap(
    tenantId: string, storeId: string, professionalId: string,
    date: string, startTime: string, endTime: string, excludeId?: string,
  ) {
    const where: any = {
      tenantId, storeId,
      professionalId,
      date: new Date(date),
      status: { notIn: ['cancelled', 'no_show'] },
      // Overlap: existing.startTime < newEndTime AND existing.endTime > newStartTime
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    };
    if (excludeId) where.id = { not: excludeId };

    const conflict = await this.prisma.appointment.findFirst({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    });

    if (conflict) {
      throw new ConflictException(
        `Conflicto de horario: ${conflict.customer.firstName} ${conflict.customer.lastName} ` +
        `ya tiene "${conflict.service.name}" agendado de ${conflict.startTime} a ${conflict.endTime} ` +
        `con el mismo profesional.`
      );
    }
  }

  async getAvailableSlots(tenantId: string, storeId: string, date: string, professionalId: string, duration: number) {
    // Simplified: return morning/afternoon slots
    const existing = await this.prisma.appointment.findMany({
      where: { tenantId, storeId, professionalId, date: new Date(date), status: { notIn: ['cancelled', 'no_show'] } },
      select: { startTime: true, endTime: true },
    });

    const busySlots = existing.map(a => a.startTime);
    const allSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    return allSlots.filter(s => !busySlots.includes(s));
  }

  async getWeekSummary(tenantId: string, storeId: string) {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

    const [total, byStatus, confirmed] = await Promise.all([
      this.prisma.appointment.count({ where: { tenantId, storeId, date: { gte: weekStart, lt: weekEnd } } }),
      this.prisma.appointment.groupBy({ by: ['status'], where: { tenantId, storeId, date: { gte: weekStart, lt: weekEnd } }, _count: true }),
      this.prisma.appointment.count({ where: { tenantId, storeId, date: { gte: weekStart, lt: weekEnd }, status: 'confirmed' } }),
    ]);

    return { total, confirmed, byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])) };
  }
}
