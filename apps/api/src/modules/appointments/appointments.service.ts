import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

/** Suma minutos a una hora "HH:mm" y devuelve "HH:mm" (24h). */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const eh = Math.floor(total / 60) % 24;
  const em = ((total % 60) + 60) % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

/** Normaliza una fecha (string|Date) a "YYYY-MM-DD" para claves de bloqueo. */
function dateKey(d: string | Date): string {
  return (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10);
}

@Injectable()
export class AppointmentsService {
  // Transiciones válidas de estado de una cita.
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    pending:     ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    confirmed:   ['in_progress', 'completed', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed:   [],
    cancelled:   [],
    no_show:     [],
  };
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
    private email: EmailService,
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
    // Validar que el servicio pertenezca a esta tienda y obtener precio/duración
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId, storeId },
      select: { id: true, price: true, durationMinutes: true },
    });
    if (!service) throw new BadRequestException('Servicio no encontrado en esta tienda');

    if (dto.professionalId) await this.assertProfessional(tenantId, storeId, dto.professionalId);
    if (dto.customerId) await this.assertCustomer(tenantId, dto.customerId);
    if (dto.nailDesignId) await this.assertNailDesign(tenantId, storeId, dto.nailDesignId);

    const startTime = dto.startTime;
    const endTime = dto.endTime ?? addMinutes(startTime, service.durationMinutes);
    const price = dto.price ?? Number(service.price);

    // Crear con verificación de solape atómica (lock por profesional+día)
    const appointment = await this.prisma.$transaction(async (tx) => {
      if (dto.professionalId) {
        await this.lockProfessionalDay(tx, dto.professionalId, dto.date);
        await this.checkOverlap(tx, tenantId, storeId, dto.professionalId, dto.date, startTime, endTime);
      }
      return tx.appointment.create({
        data: {
          tenantId, storeId,
          serviceId: dto.serviceId,
          customerId: dto.customerId ?? null,
          professionalId: dto.professionalId ?? null,
          nailDesignId: dto.nailDesignId ?? null,
          date: new Date(dto.date),
          startTime, endTime,
          notes: dto.notes ?? null,
          price,
          status: 'pending',
          originChannel: 'manual',
        },
        include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }, service: true, professional: { select: { id: true, firstName: true } } },
      });
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

    // Send email notification
    if ((appointment.customer as any)?.email) {
      this.email.sendAppointmentCreated({
        customerName: appointment.customer!.firstName,
        customerEmail: (appointment.customer as any).email,
        serviceName: appointment.service?.name || 'Servicio',
        date: dto.date,
        time: dto.startTime,
        professionalName: appointment.professional?.firstName,
        price: Number(appointment.price),
      }).catch(err => console.error('Email notification failed:', err.message));
    }

    return appointment;
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    const current = await this.findOne(tenantId, storeId, id);

    // Validar referencias cambiadas (que pertenezcan a esta tienda/tenant)
    if (dto.serviceId) {
      const svc = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId, storeId }, select: { id: true } });
      if (!svc) throw new BadRequestException('Servicio no encontrado en esta tienda');
    }
    if (dto.professionalId) await this.assertProfessional(tenantId, storeId, dto.professionalId);
    if (dto.customerId) await this.assertCustomer(tenantId, dto.customerId);
    if (dto.nailDesignId) await this.assertNailDesign(tenantId, storeId, dto.nailDesignId);

    // Construir data explícito (sin status/tenantId/storeId — anti mass-assignment)
    const data: any = {};
    for (const k of ['serviceId', 'customerId', 'professionalId', 'nailDesignId', 'startTime', 'endTime', 'notes', 'price'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.date !== undefined) data.date = new Date(dto.date);

    const needsOverlap = dto.date || dto.startTime || dto.endTime || dto.professionalId;

    return this.prisma.$transaction(async (tx) => {
      if (needsOverlap) {
        const date = dto.date ?? current.date;
        const startTime = dto.startTime ?? current.startTime;
        const endTime = dto.endTime ?? current.endTime;
        const professionalId = dto.professionalId ?? current.professionalId;
        if (professionalId) {
          await this.lockProfessionalDay(tx, professionalId, date);
          await this.checkOverlap(tx, tenantId, storeId, professionalId, date, startTime, endTime, id);
        }
      }
      return tx.appointment.update({ where: { id, tenantId, storeId }, data });
    });
  }

  async updateStatus(tenantId: string, storeId: string, id: string, status: string, reason?: string) {
    const a = await this.findOne(tenantId, storeId, id);

    if (a.status === status) return a; // no-op idempotente
    const allowed = AppointmentsService.STATUS_TRANSITIONS[a.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Transición de estado inválida: ${a.status} → ${status}`);
    }

    const updates: any = { status };
    if (status === 'confirmed') updates.confirmedAt = new Date();
    if (status === 'completed') updates.completedAt = new Date();
    if (status === 'cancelled') { updates.cancelledAt = new Date(); updates.cancelReason = reason; }

    const updated = await this.prisma.appointment.update({ where: { id, tenantId, storeId }, data: updates,
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }, service: true, professional: { select: { id: true, firstName: true } } },
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

    // Send email notification based on status change
    const customerEmail = (updated.customer as any)?.email;
    if (customerEmail) {
      const emailData = {
        customerName: updated.customer!.firstName,
        customerEmail,
        serviceName: updated.service?.name || 'Servicio',
        date: String(updated.date),
        time: updated.startTime,
        professionalName: updated.professional?.firstName,
        reason,
      };
      if (status === 'confirmed') {
        this.email.sendAppointmentConfirmed(emailData)
          .catch(err => console.error('Email confirm notification failed:', err.message));
      } else if (status === 'cancelled') {
        this.email.sendAppointmentCancelled(emailData)
          .catch(err => console.error('Email cancel notification failed:', err.message));
      }
    }

    return updated;
  }

  // ── Validación de referencias (pertenencia a tienda/tenant) ────────────────

  private async assertProfessional(tenantId: string, storeId: string, professionalId: string) {
    const p = await this.prisma.user.findFirst({
      where: { id: professionalId, tenantId, isActive: true, deletedAt: null, OR: [{ storeId }, { storeId: null }] },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('Profesional no válido para esta tienda');
  }

  private async assertCustomer(tenantId: string, customerId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null }, select: { id: true } });
    if (!c) throw new BadRequestException('Cliente no encontrado');
  }

  private async assertNailDesign(tenantId: string, storeId: string, nailDesignId: string) {
    const d = await this.prisma.nailDesign.findFirst({ where: { id: nailDesignId, tenantId, storeId }, select: { id: true } });
    if (!d) throw new BadRequestException('Diseño no encontrado en esta tienda');
  }

  /**
   * Lock de transacción por (profesional, día): serializa las reservas
   * concurrentes del mismo profesional para evitar doble-booking por TOCTOU.
   * Se libera automáticamente al terminar la transacción.
   */
  private async lockProfessionalDay(tx: Prisma.TransactionClient, professionalId: string, date: string | Date) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `${professionalId}:${dateKey(date)}`);
  }

  private async checkOverlap(
    client: Prisma.TransactionClient | PrismaService,
    tenantId: string, storeId: string, professionalId: string,
    date: string | Date, startTime: string, endTime: string, excludeId?: string,
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

    const conflict = await client.appointment.findFirst({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    });

    if (conflict) {
      throw new ConflictException(
        `Conflicto de horario: ${conflict.customer?.firstName ?? 'Cliente'} ${conflict.customer?.lastName ?? ''} ` +
        `ya tiene "${conflict.service?.name ?? 'servicio'}" agendado de ${conflict.startTime} a ${conflict.endTime} ` +
        `con el mismo profesional.`
      );
    }
  }

  async getAvailableSlots(tenantId: string, storeId: string, date: string, professionalId: string, duration: number) {
    const existing = await this.prisma.appointment.findMany({
      where: { tenantId, storeId, professionalId, date: new Date(date), status: { notIn: ['cancelled', 'no_show'] } },
      select: { startTime: true, endTime: true },
    });

    const dur = Number(duration) > 0 ? Number(duration) : 60;
    const allSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    // Una franja está libre si, considerando la duración pedida, no se solapa
    // con ninguna cita existente (overlap: existing.start < slotEnd && existing.end > slot).
    return allSlots.filter((slot) => {
      const slotEnd = addMinutes(slot, dur);
      return !existing.some(a => a.startTime < slotEnd && a.endTime > slot);
    });
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

  // ─── Customer (storefront) booking ─────────────────────────────────────────

  /**
   * Book an appointment from the storefront.
   * The customer is a platform user (tenantId = null).
   * dto must include: storeId, serviceId, date, startTime, endTime,
   *   and optionally professionalId, notes, nailDesignId.
   */
  async customerBook(userCtx: any, dto: any) {
    // Fetch full user profile (JWT only carries id/email/role)
    const user = await this.prisma.user.findUnique({
      where: { id: userCtx.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Resolve store + tenant
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      select: { id: true, tenantId: true, isActive: true, acceptsOnlineAppointments: true },
    });
    if (!store || !store.isActive) throw new NotFoundException('Tienda no encontrada');
    if (!store.acceptsOnlineAppointments) {
      throw new BadRequestException('Esta tienda no acepta reservas en línea.');
    }

    // El servicio debe pertenecer a la tienda y ser visible/booqueable
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId: store.tenantId, storeId: store.id, isStoreVisible: true },
      select: { id: true, price: true, durationMinutes: true },
    });
    if (!service) throw new BadRequestException('Servicio no disponible para reserva en línea');

    if (dto.professionalId) await this.assertProfessional(store.tenantId, store.id, dto.professionalId);
    if (dto.nailDesignId) await this.assertNailDesign(store.tenantId, store.id, dto.nailDesignId);

    // Hora fin y validación de fecha (no reservar en el pasado)
    const startTime = dto.startTime;
    const endTime = dto.endTime ?? addMinutes(startTime, service.durationMinutes);
    const apptDate = new Date(dto.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (apptDate < today) throw new BadRequestException('No se puede reservar en una fecha pasada');

    // Upsert Customer record in this salon for the platform user
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId: store.tenantId, email: user.email },
    });

    let customer: any;
    if (existing) {
      customer = existing;
    } else {
      // Generate a sequential customer number
      const count = await this.prisma.customer.count({ where: { tenantId: store.tenantId } });
      const customerNumber = `C-${String(count + 1).padStart(5, '0')}`;
      customer = await this.prisma.customer.create({
        data: {
          tenantId: store.tenantId,
          storeId: store.id,
          customerNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone ?? null,
          source: 'storefront',
        },
      });
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      if (dto.professionalId) {
        await this.lockProfessionalDay(tx, dto.professionalId, dto.date);
        await this.checkOverlap(tx, store.tenantId, store.id, dto.professionalId, dto.date, startTime, endTime);
      }
      return tx.appointment.create({
        data: {
          tenantId: store.tenantId,
          storeId: store.id,
          customerId: customer.id,
          serviceId: service.id,
          professionalId: dto.professionalId ?? null,
          nailDesignId: dto.nailDesignId ?? null,
          date: apptDate,
          startTime,
          endTime,
          notes: dto.notes ?? null,
          status: 'pending',
          price: Number(service.price), // precio autoritativo del servidor (no del cliente)
          originChannel: 'storefront',
        },
        include: {
          service: { select: { id: true, name: true, price: true, durationMinutes: true } },
          professional: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          store: { select: { id: true, name: true } },
        },
      });
    });

    // Send confirmation email for storefront bookings
    if (user.email) {
      this.email.sendAppointmentCreated({
        customerName: user.firstName,
        customerEmail: user.email,
        serviceName: appointment.service?.name || 'Servicio',
        date: dto.date,
        time: dto.startTime,
        professionalName: appointment.professional
          ? `${appointment.professional.firstName} ${appointment.professional.lastName ?? ''}`.trim()
          : undefined,
        storeName: appointment.store?.name,
        price: Number(appointment.price) || undefined,
      }).catch(err => console.error('Email storefront booking failed:', err.message));
    }

    return appointment;
  }

  /**
   * Get all appointments booked by a platform customer (by their email across all salons).
   */
  async myAppointments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return [];

    // Find all Customer records linked to this email (across tenants)
    const customers = await this.prisma.customer.findMany({
      where: { email: user.email },
      select: { id: true },
    });
    if (!customers.length) return [];

    const customerIds = customers.map(c => c.id);
    return this.prisma.appointment.findMany({
      where: { customerId: { in: customerIds } },
      include: {
        service: { select: { id: true, name: true, price: true } },
        professional: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
  }
}
