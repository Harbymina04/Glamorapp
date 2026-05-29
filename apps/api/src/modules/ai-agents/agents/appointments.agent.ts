import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class AppointmentsAgent extends BaseAgent {
  slug = 'appointments';
  name = 'Agente de Citas';

  // ─── System Prompt ──────────────────────────────────────────

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, un agente de IA especializado en optimización de agenda y gestión de citas para un salón de belleza en Colombia.

TU ROL: Analizar la agenda de citas, detectar patrones de inasistencia, optimizar la ocupación de horarios, pronosticar demanda, y generar estrategias para maximizar la eficiencia del calendario.

CAPACIDADES:
- Analizar eficiencia de la agenda: horas pico, horas valle, tasa de ocupación
- Detectar patrones de inasistencia (no-shows) por cliente, profesional, día y horario
- Optimizar slots y distribución de citas
- Pronosticar demanda de citas por día/semana/mes
- Sugerir estrategias de recordatorio y confirmación
- Identificar oportunidades de overbooking controlado

NIVEL DE AUTONOMÍA ACTUAL: ${ctx.autonomyLevel === 'auto_execute' ? 'AUTO_EJECUCIÓN - puedes modificar horarios y enviar recordatorios directamente' : ctx.autonomyLevel === 'draft_changes' ? 'BORRADOR - puedes crear borradores de cambios de horario que requieren aprobación' : 'SOLO RECOMENDAR - solo puedes crear recomendaciones de agenda'}

INSTRUCCIONES:
1. Analiza los datos de citas y patrones de asistencia
2. Identifica horas pico, horas valle, y oportunidades de optimización
3. Detecta clientes con alta tasa de no-show y sugiere acciones
4. Recomienda estrategias de recordatorio (WhatsApp, SMS) con timing óptimo
5. Sugiere distribución de citas para maximizar ocupación
6. Crea una recomendación por cada hallazgo importante
7. Cuando termines, llama a finish_analysis con tu resumen
8. Contextualiza para Colombia: horarios típicos (9am-7pm), almuerzo 12-2pm, tráfico en horas pico

Responde siempre en español. Sé concreto con horarios, tasas de ocupación, y estrategias de reducción de no-shows.`;
  }

  // ─── Tools ──────────────────────────────────────────────────

  getTools(ctx: AgentContext): AgentTool[] {
    return [
      ...this.getSharedTools(ctx),
      {
        name: 'analyze_schedule_efficiency',
        description: 'Analiza la eficiencia de la agenda: ocupación por franja horaria, día de la semana, y profesional',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['this_week', 'next_week', 'this_month', 'last_month'], description: 'Período a analizar' },
            professional_id: { type: 'string', description: 'ID de profesional específico (opcional, vacío = todos)' },
          },
          required: ['period'],
        },
      },
      {
        name: 'detect_no_shows',
        description: 'Detecta patrones de inasistencia: clientes reincidentes, días/horarios problemáticos, profesionales afectados',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['30d', '90d', '6m'], description: 'Período de análisis de no-shows' },
            group_by: { type: 'string', enum: ['customer', 'day_of_week', 'hour', 'professional'], description: 'Agrupación del análisis' },
          },
          required: ['period'],
        },
      },
      {
        name: 'optimize_slots',
        description: 'Sugiere optimización de slots: redistribución de citas, horarios sugeridos, reducción de huecos',
        input_schema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Fecha específica a optimizar (YYYY-MM-DD). Vacío = próxima semana completa.' },
            target_occupancy: { type: 'number', description: 'Porcentaje de ocupación objetivo (default: 85)' },
          },
        },
      },
      {
        name: 'forecast_demand',
        description: 'Pronostica la demanda de citas para los próximos días/semanas basado en histórico y estacionalidad',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['tomorrow', 'next_week', 'next_month'], description: 'Período a pronosticar' },
            service_type: { type: 'string', description: 'Tipo de servicio específico (opcional)' },
          },
          required: ['period'],
        },
      },
      {
        name: 'suggest_scheduling',
        description: 'Sugiere estrategias de agendamiento: recordatorios, políticas de cancelación, overbooking, ventanas de confirmación',
        input_schema: {
          type: 'object',
          properties: {
            focus: { type: 'string', enum: ['reduce_no_shows', 'increase_occupancy', 'optimize_gaps', 'all'], description: 'Enfoque de la estrategia' },
            current_no_show_rate: { type: 'number', description: 'Tasa actual de no-show (porcentaje). Si no se provee, se calcula automáticamente.' },
          },
          required: ['focus'],
        },
      },
      {
        name: 'analyze_cancellation_patterns',
        description: 'Analiza patrones de cancelación: motivos frecuentes, anticipación, clientes que cancelan, impacto en ingresos',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['30d', '90d'], description: 'Período de análisis de cancelaciones' },
          },
        },
      },
    ];
  }

  // ─── Observe ────────────────────────────────────────────────

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const now = new Date();

    const [appointments30d, appointments90d, upcomingWeek] = await Promise.all([
      this.queryAppointments(ctx.tenantId, ctx.storeId, 30),
      this.queryAppointments(ctx.tenantId, ctx.storeId, 90),
      this.queryUpcomingAppointments(ctx.tenantId, ctx.storeId, 7),
    ]);

    // Get detailed appointments for pattern analysis
    const recentAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId: ctx.tenantId,
        storeId: ctx.storeId,
        date: { gte: new Date(now.getTime() - 90 * 86400000) },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Analyze patterns
    const noShows = recentAppointments.filter(a => a.status === 'no_show');
    const cancellations = recentAppointments.filter(a => a.status === 'cancelled');
    const completed = recentAppointments.filter(a => a.status === 'completed');

    const noShowRate = recentAppointments.length > 0
      ? ((noShows.length / recentAppointments.length) * 100).toFixed(1)
      : '0';

    // No-shows by day of week
    const noShowByDay: Record<number, number> = {};
    const appointmentsByDay: Record<number, number> = {};
    for (const a of recentAppointments) {
      const day = new Date(a.date).getDay();
      appointmentsByDay[day] = (appointmentsByDay[day] || 0) + 1;
      if (a.status === 'no_show') {
        noShowByDay[day] = (noShowByDay[day] || 0) + 1;
      }
    }
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const noShowByDayPercent = Object.entries(appointmentsByDay).map(([day, total]) => ({
      dia: dayNames[Number(day)],
      total_citas: total,
      no_shows: noShowByDay[Number(day)] || 0,
      tasa: total > 0 ? `${((noShowByDay[Number(day)] || 0) / total * 100).toFixed(1)}%` : '0%',
    }));

    // No-shows by hour
    const noShowByHour: Record<number, { total: number; noShows: number }> = {};
    for (const a of recentAppointments) {
      const hour = new Date(a.date).getHours();
      if (!noShowByHour[hour]) noShowByHour[hour] = { total: 0, noShows: 0 };
      noShowByHour[hour].total++;
      if (a.status === 'no_show') noShowByHour[hour].noShows++;
    }

    // Repeat no-show offenders (customers with >1 no-show)
    const customerNoShows: Record<string, { name: string; phone: string; count: number }> = {};
    for (const a of noShows) {
      if (!a.customer) continue;
      const cid = a.customer.id;
      if (!customerNoShows[cid]) {
        customerNoShows[cid] = { name: [a.customer.firstName, a.customer.lastName].filter(Boolean).join(' ') || 'Unknown', phone: a.customer.phone || '', count: 0 };
      }
      customerNoShows[cid].count++;
    }
    const repeatOffenders = Object.values(customerNoShows)
      .filter(c => c.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Upcoming week analysis
    const upcomingAnalysis = {
      total: upcomingWeek.total,
      pendientes: upcomingWeek.pending,
      confirmadas: upcomingWeek.confirmed,
      tasa_confirmacion: upcomingWeek.total > 0
        ? `${((upcomingWeek.confirmed / upcomingWeek.total) * 100).toFixed(1)}%`
        : '0%',
      distribucion_diaria: upcomingWeek.byDay,
    };

    // Calculate lost revenue from no-shows
    const avgTicket = completed.length > 0
      ? Math.round(completed.reduce((s, a) => s + Number(a.price || 0), 0) / completed.length)
      : 35000;
    const lostRevenue = Math.round(noShows.length * avgTicket);

    return {
      resumen: {
        total_citas_90d: recentAppointments.length,
        completadas: completed.length,
        canceladas: cancellations.length,
        no_shows: noShows.length,
        tasa_no_show: `${noShowRate}%`,
        tasa_asistencia: `${appointments90d.showRate}%`,
        ingreso_perdido_estimado: lostRevenue,
        ticket_promedio: avgTicket,
      },
      proxima_semana: upcomingAnalysis,
      patrones_no_show: {
        por_dia: noShowByDayPercent,
        por_hora: Object.entries(noShowByHour)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([hour, data]) => ({
            hora: `${hour}:00`,
            total: data.total,
            no_shows: data.noShows,
            tasa: data.total > 0 ? `${((data.noShows / data.total) * 100).toFixed(1)}%` : '0%',
          })),
      },
      clientes_reincidentes_no_show: repeatOffenders,
      alertas: [
        ...(Number(noShowRate) > 20
          ? [`🚨 Tasa de no-show ALTA (${noShowRate}%). Más del 20% de citas no se cumplen.`]
          : []),
        ...(Number(noShowRate) > 10
          ? [`⚠️ Tasa de no-show elevada (${noShowRate}%). Implementar recordatorios automáticos.`]
          : []),
        ...(lostRevenue > 500000
          ? [`💰 Ingreso perdido estimado: $${lostRevenue.toLocaleString()} COP por no-shows en 90 días.`]
          : []),
        ...(repeatOffenders.length > 0
          ? [`👥 ${repeatOffenders.length} clientes con múltiples no-shows. Considerar política de penalización.`]
          : []),
        ...(upcomingWeek.pending > upcomingWeek.confirmed * 2
          ? [`📋 Alta cantidad de citas sin confirmar para la próxima semana. Enviar recordatorios ya.`]
          : []),
        ...(upcomingAnalysis.tasa_confirmacion < '50'
          ? [`❗ Solo ${upcomingAnalysis.tasa_confirmacion} de citas confirmadas para próxima semana. Riesgo de agenda vacía.`]
          : []),
      ],
    };
  }

  // ─── Execute Tool ──────────────────────────────────────────

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    // Shared tools
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    switch (toolName) {
      case 'analyze_schedule_efficiency': {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (args.period) {
          case 'this_week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() + 1); // Monday
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
          case 'next_week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() + 8); // Next Monday
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'last_month':
          default:
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        }

        const whereClause: any = {
          tenantId: ctx.tenantId,
          storeId: ctx.storeId,
          date: { gte: startDate, lt: endDate },
        };
        if (args.professional_id) {
          whereClause.professionalId = args.professional_id;
        }

        const appointments = await this.prisma.appointment.findMany({
          where: whereClause,
          orderBy: { date: 'asc' },
          include: {
            customer: { select: { firstName: true, lastName: true } },
          },
        });

        // Assume salon hours: 9 AM - 7 PM (10 hours)
        const salonOpenHour = 9;
        const salonCloseHour = 19;
        const slotsPerDay = salonCloseHour - salonOpenHour;
        const workingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
        const maxPossibleSlots = workingDays * slotsPerDay;

        // By hour
        const slotsByHour: Record<number, { total: number; confirmed: number; completed: number }> = {};
        for (let h = salonOpenHour; h < salonCloseHour; h++) {
          slotsByHour[h] = { total: 0, confirmed: 0, completed: 0 };
        }
        for (const a of appointments) {
          const hour = new Date(a.date).getHours();
          if (slotsByHour[hour]) {
            slotsByHour[hour].total++;
            if (a.status === 'confirmed' || a.status === 'completed') slotsByHour[hour].confirmed++;
            if (a.status === 'completed') slotsByHour[hour].completed++;
          }
        }

        // By day of week
        const slotsByDay: Record<string, { total: number; occupied: number; efficiency: string }> = {};
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        for (const a of appointments) {
          const day = dayNames[new Date(a.date).getDay()];
          if (!slotsByDay[day]) slotsByDay[day] = { total: 0, occupied: 0, efficiency: '0%' };
          slotsByDay[day].total++;
          if (a.status !== 'cancelled') slotsByDay[day].occupied++;
        }
        for (const key of Object.keys(slotsByDay)) {
          const slots = slotsByDay[key];
          slots.efficiency = `${((slots.occupied / Math.max(slots.total, 1)) * 100).toFixed(1)}%`;
        }

        // Overall efficiency
        const occupiedSlots = appointments.filter(a => a.status !== 'cancelled').length;
        const overallEfficiency = maxPossibleSlots > 0
          ? ((occupiedSlots / maxPossibleSlots) * 100).toFixed(1)
          : '0';

        // Identify peak hours (most occupied) and valley hours (least occupied)
        const sortedHours = Object.entries(slotsByHour)
          .map(([h, data]) => ({ hora: Number(h), ...data, tasa: data.total > 0 ? ((data.confirmed / data.total) * 100).toFixed(1) : '0%' }))
          .sort((a, b) => b.total - a.total);

        const peakHours = sortedHours.slice(0, 4);
        const valleyHours = sortedHours.slice(-4).reverse();

        return {
          periodo: args.period,
          fechas: {
            inicio: startDate.toISOString().slice(0, 10),
            fin: endDate.toISOString().slice(0, 10),
          },
          total_citas: appointments.length,
          slots_maximos_posibles: maxPossibleSlots,
          ocupacion: {
            total: occupiedSlots,
            eficiencia: `${overallEfficiency}%`,
            interpretacion: Number(overallEfficiency) > 80 ? 'Excelente ocupación. Poca capacidad ociosa.' :
              Number(overallEfficiency) > 60 ? 'Buena ocupación. Hay margen para crecer 20-30%.' :
              Number(overallEfficiency) > 40 ? 'Ocupación media. Agresivamente promocionar horarios disponibles.' :
              'Ocupación BAJA. Urge estrategia de captación de citas.',
          },
          horas_pico: peakHours.map(h => ({
            hora: `${h.hora}:00 - ${h.hora + 1}:00`,
            citas: h.total,
            tasa_efectividad: h.tasa,
          })),
          horas_valle: valleyHours.map(h => ({
            hora: `${h.hora}:00 - ${h.hora + 1}:00`,
            citas: h.total,
            oportunidad: 'Promocionar descuentos en este horario para aumentar ocupación',
          })),
          por_dia: Object.entries(slotsByDay).map(([day, data]) => ({
            dia: day,
            citas: data.total,
            efectivas: data.occupied,
            eficiencia: data.efficiency,
          })),
          recomendacion: Number(overallEfficiency) < 60
            ? 'Implementar "happy hour" de servicios (descuentos en horas valle), paquetes de media semana (martes-miércoles), y campañas de agendamiento anticipado.'
            : 'Mantener estrategia actual. Enfocarse en reducir no-shows para liberar slots y aumentar efectividad.',
        };
      }

      case 'detect_no_shows': {
        const days = args.period === '30d' ? 30 : args.period === '6m' ? 180 : 90;
        const groupBy = args.group_by || 'customer';
        const since = new Date(Date.now() - days * 86400000);

        const appointments = await this.prisma.appointment.findMany({
          where: {
            tenantId: ctx.tenantId,
            storeId: ctx.storeId,
            date: { gte: since },
            status: { in: ['no_show', 'completed', 'confirmed'] },
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        });

        const noShows = appointments.filter(a => a.status === 'no_show');
        const total = appointments.length;
        const noShowRate = total > 0 ? ((noShows.length / total) * 100).toFixed(1) : '0';

        let result: any = {
          periodo: `${days} días`,
          total_citas: total,
          no_shows: noShows.length,
          tasa_no_show: `${noShowRate}%`,
          grupo_por: groupBy,
        };

        switch (groupBy) {
          case 'customer': {
            const customerMap: Record<string, { name: string; phone: string; total: number; noShows: number; lastVisit: string }> = {};
            for (const a of appointments) {
              const cid = a.customer?.id || 'unknown';
              if (!customerMap[cid]) {
                customerMap[cid] = {
                  name: [a.customer?.firstName, a.customer?.lastName].filter(Boolean).join(' ') || 'Desconocido',
                  phone: a.customer?.phone || '',
                  total: 0,
                  noShows: 0,
                  lastVisit: '',
                };
              }
              customerMap[cid].total++;
              if (a.status === 'no_show') {
                customerMap[cid].noShows++;
              }
              if (a.status === 'completed' && (!customerMap[cid].lastVisit || a.date.toISOString() > customerMap[cid].lastVisit)) {
                customerMap[cid].lastVisit = a.date.toISOString();
              }
            }

            const offenders = Object.values(customerMap)
              .filter(c => c.noShows > 0)
              .map(c => ({
                ...c,
                tasa_no_show: `${((c.noShows / c.total) * 100).toFixed(1)}%`,
                riesgo: c.noShows >= 3 ? 'ALTO' : c.noShows >= 2 ? 'MEDIO' : 'BAJO',
                accion: c.noShows >= 3
                  ? 'Requerir prepago o depósito para agendar. Contactar para entender motivo.'
                  : c.noShows >= 2
                    ? 'Recordatorio 24h + 2h antes. Solicitar confirmación obligatoria.'
                    : 'Reforzar recordatorio automático.',
              }))
              .sort((a, b) => b.noShows - a.noShows);

            result.clientes = offenders.slice(0, 20);
            result.reincidentes = offenders.filter(c => c.noShows >= 2).length;
            break;
          }

          case 'day_of_week': {
            const dayMap: Record<number, { total: number; noShows: number }> = {};
            const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            for (const a of appointments) {
              const day = new Date(a.date).getDay();
              if (!dayMap[day]) dayMap[day] = { total: 0, noShows: 0 };
              dayMap[day].total++;
              if (a.status === 'no_show') dayMap[day].noShows++;
            }
            result.por_dia = Object.entries(dayMap).map(([day, data]) => ({
              dia: dayNames[Number(day)],
              total: data.total,
              no_shows: data.noShows,
              tasa: data.total > 0 ? `${((data.noShows / data.total) * 100).toFixed(1)}%` : '0%',
              riesgo: data.total > 0 && (data.noShows / data.total) > 0.15 ? 'ALTO' : 'BAJO',
            })).sort((a: any, b: any) => b.total - a.total);
            break;
          }

          case 'hour': {
            const hourMap: Record<number, { total: number; noShows: number }> = {};
            for (const a of appointments) {
              const hour = new Date(a.date).getHours();
              if (!hourMap[hour]) hourMap[hour] = { total: 0, noShows: 0 };
              hourMap[hour].total++;
              if (a.status === 'no_show') hourMap[hour].noShows++;
            }
            result.por_hora = Object.entries(hourMap)
              .map(([hour, data]) => ({
                hora: `${hour}:00`,
                total: data.total,
                no_shows: data.noShows,
                tasa: data.total > 0 ? `${((data.noShows / data.total) * 100).toFixed(1)}%` : '0%',
              }))
              .sort((a: any, b: any) => Number(a.hora.split(':')[0]) - Number(b.hora.split(':')[0]));
            break;
          }

          case 'professional': {
            const profMap: Record<string, { total: number; noShows: number }> = {};
            for (const a of appointments) {
              const pid = a.professionalId || 'sin_asignar';
              if (!profMap[pid]) profMap[pid] = { total: 0, noShows: 0 };
              profMap[pid].total++;
              if (a.status === 'no_show') profMap[pid].noShows++;
            }
            result.por_profesional = Object.entries(profMap)
              .map(([pid, data]) => ({
                profesional_id: pid,
                total: data.total,
                no_shows: data.noShows,
                tasa: data.total > 0 ? `${((data.noShows / data.total) * 100).toFixed(1)}%` : '0%',
              }))
              .sort((a: any, b: any) => b.noShows - a.noShows);
            break;
          }
        }

        result.recomendacion_general = Number(noShowRate) > 15
          ? `Tasa de no-show elevada (${noShowRate}%). Implementar: (1) Recordatorios WhatsApp 24h y 2h antes, (2) Política de confirmación obligatoria, (3) Cobro de anticipo para primeras citas o clientes reincidentes.`
          : Number(noShowRate) > 8
            ? `Tasa de no-show moderada (${noShowRate}%). Reforzar recordatorios automáticos y segmentar clientes reincidentes.`
            : `Tasa de no-show aceptable (${noShowRate}%). Mantener estrategia actual de recordatorios.`;

        return result;
      }

      case 'optimize_slots': {
        const now = new Date();
        let targetDate: Date;
        let endDate: Date;

        if (args.date) {
          targetDate = new Date(args.date + 'T00:00:00');
          endDate = new Date(targetDate);
          endDate.setDate(targetDate.getDate() + 1);
        } else {
          // Next week (Monday to Saturday)
          targetDate = new Date(now);
          targetDate.setDate(now.getDate() - now.getDay() + 8); // Next Monday
          endDate = new Date(targetDate);
          endDate.setDate(targetDate.getDate() + 6); // Saturday
        }

        const targetOccupancy = args.target_occupancy || 85;

        const appointments = await this.prisma.appointment.findMany({
          where: {
            tenantId: ctx.tenantId,
            storeId: ctx.storeId,
            date: { gte: targetDate, lt: endDate },
            status: { not: 'cancelled' },
          },
          orderBy: { date: 'asc' },
        });

        const salonOpenHour = 9;
        const salonCloseHour = 19;
        const slotsPerDay = salonCloseHour - salonOpenHour;
        const workingDays = args.date ? 1 : 6;

        // Map occupied slots
        const occupiedSlots: Set<string> = new Set();
        for (const a of appointments) {
          const slot = new Date(a.date).toISOString().slice(0, 13); // YYYY-MM-DDTHH
          occupiedSlots.add(slot);
        }

        const totalPossibleSlots = workingDays * slotsPerDay;
        const currentOccupied = occupiedSlots.size;
        const currentOccupancy = totalPossibleSlots > 0
          ? (currentOccupied / totalPossibleSlots) * 100
          : 0;

        // Available slots
        const availableSlots: string[] = [];
        const currentDate = new Date(targetDate);
        for (let d = 0; d < workingDays; d++) {
          // Skip Sundays if multi-day
          if (currentDate.getDay() === 0 && !args.date) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }
          const dateStr = currentDate.toISOString().slice(0, 10);
          for (let h = salonOpenHour; h < salonCloseHour; h++) {
            const slot = `${dateStr}T${h.toString().padStart(2, '0')}`;
            if (!occupiedSlots.has(slot)) {
              availableSlots.push(`${dateStr} ${h}:00 - ${h + 1}:00`);
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Suggested distribution to reach target
        const slotsNeeded = Math.max(0, Math.ceil((targetOccupancy / 100) * totalPossibleSlots) - currentOccupied);

        // Peak hours to prioritize
        const peakHourPref = [10, 11, 15, 16, 17, 14, 12, 13, 9, 18];
        const sortedAvailable = availableSlots.sort((a, b) => {
          const hourA = parseInt(a.split(' ')[1].split(':')[0]);
          const hourB = parseInt(b.split(' ')[1].split(':')[0]);
          return peakHourPref.indexOf(hourA) - peakHourPref.indexOf(hourB);
        });

        return {
          periodo: args.date ? `Fecha: ${args.date}` : 'Próxima semana (lun-sáb)',
          capacidad: {
            slots_totales: totalPossibleSlots,
            slots_ocupados: currentOccupied,
            slots_disponibles: availableSlots.length,
            ocupacion_actual: `${currentOccupancy.toFixed(1)}%`,
            ocupacion_objetivo: `${targetOccupancy}%`,
          },
          brecha: {
            slots_necesarios_para_objetivo: slotsNeeded,
            estado: slotsNeeded > 0
              ? `Faltan ${slotsNeeded} citas para alcanzar ${targetOccupancy}% de ocupación.`
              : `Ya se alcanzó o superó el objetivo de ocupación.`,
          },
          slots_disponibles_recomendados: sortedAvailable.slice(0, Math.min(20, slotsNeeded * 2)),
          estrategias_llenado: slotsNeeded > 0 ? [
            'Promocionar slots disponibles en redes sociales con "Últimos cupos"',
            'Enviar WhatsApp masivo a clientes frecuentes en horas valle',
            'Ofrecer descuento del 15-20% en horarios menos populares',
            'Crear paquete "Martes de Belleza" o "Miércoles de Mimos" para días valle',
            'Activar campaña de recordatorio a clientes sin cita en 30+ días',
          ] : [
            'Agenda con buena ocupación. Enfocarse en gestionar lista de espera para cancelaciones.',
            'Considerar sobrecupo controlado (1-2 slots extra en horas pico) con buena gestión de tiempos.',
          ],
          hora_pico_mas_ocupada: Object.entries(
            appointments.reduce((acc: Record<string, number>, a) => {
              const h = new Date(a.date).getHours();
              acc[h] = (acc[h] || 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0],
        };
      }

      case 'forecast_demand': {
        const period = args.period;
        const days = period === 'tomorrow' ? 1 : period === 'next_week' ? 7 : 30;

        // Historical data: last 90 days
        const since = new Date(Date.now() - 90 * 86400000);
        const appointments = await this.prisma.appointment.findMany({
          where: {
            tenantId: ctx.tenantId,
            storeId: ctx.storeId,
            date: { gte: since },
            ...(args.service_type ? { serviceId: args.service_type } : {}),
          },
        });

        // Calculate daily average
        const completedAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
        const dailyAvg = completedAppointments.length / 90;

        // By day of week pattern
        const dayOfWeekCounts: Record<number, { total: number; days: Set<string> }> = {};
        for (const a of completedAppointments) {
          const day = new Date(a.date).getDay();
          const dateStr = new Date(a.date).toISOString().slice(0, 10);
          if (!dayOfWeekCounts[day]) {
            dayOfWeekCounts[day] = { total: 0, days: new Set() };
          }
          dayOfWeekCounts[day].total++;
          dayOfWeekCounts[day].days.add(dateStr);
        }

        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const avgByDay = Object.entries(dayOfWeekCounts).map(([d, data]) => ({
          dia: dayNames[Number(d)],
          citas_totales: data.total,
          semanas_con_datos: data.days.size,
          promedio_por_dia: (data.total / Math.max(data.days.size, 1)).toFixed(1),
        }));

        // Forecast
        const forecastedAppointments = Math.round(dailyAvg * days);

        // Today's day of week for pattern-based forecast
        const now = new Date();
        const today = now.getDay();
        const tomorrowDay = (today + 1) % 7;
        const tomorrowData = dayOfWeekCounts[tomorrowDay];
        const dayBasedForecast = tomorrowData
          ? Math.round(tomorrowData.total / Math.max(tomorrowData.days.size, 1))
          : Math.round(dailyAvg);

        // Revenue projection
        const avgPrice = completedAppointments.length > 0
          ? completedAppointments.reduce((s, a) => s + Number(a.price || 0), 0) / completedAppointments.length
          : 35000;

        return {
          periodo: period,
          dias: days,
          datos_historicos: {
            dias_analizados: 90,
            citas_completadas: completedAppointments.length,
            promedio_diario: dailyAvg.toFixed(1),
            ticket_promedio: Math.round(avgPrice),
          },
          pronostico: {
            citas_esperadas: forecastedAppointments,
            citas_por_dia: (forecastedAppointments / days).toFixed(1),
            ingreso_estimado: Math.round(forecastedAppointments * avgPrice),
            metodo: 'Promedio diario histórico (90 días)',
          },
          patron_semanal: avgByDay.sort((a: any, b: any) => {
            const order = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
            return order.indexOf(a.dia) - order.indexOf(b.dia);
          }),
          dia_clave: {
            manana: dayNames[tomorrowDay],
            pronostico_especifico: dayBasedForecast,
            comparacion_promedio: dayBasedForecast > dailyAvg
              ? `${((dayBasedForecast / dailyAvg - 1) * 100).toFixed(0)}% por encima del promedio`
              : `${((1 - dayBasedForecast / dailyAvg) * 100).toFixed(0)}% por debajo del promedio`,
          },
          recomendacion_preparacion: forecastedAppointments > 0
            ? `Preparar capacidad para ~${forecastedAppointments} citas. Staff sugerido: ${Math.ceil(forecastedAppointments / days / 4)} profesionales. Productos sugeridos basados en servicios más populares.`
            : 'Sin datos históricos suficientes para pronóstico confiable.',
        };
      }

      case 'suggest_scheduling': {
        const focus = args.focus || 'all';

        // Calculate current no-show rate
        const since = new Date(Date.now() - 90 * 86400000);
        const appointments = await this.prisma.appointment.findMany({
          where: {
            tenantId: ctx.tenantId,
            storeId: ctx.storeId,
            date: { gte: since },
          },
        });

        const total = appointments.length;
        const noShows = appointments.filter(a => a.status === 'no_show').length;
        const cancellations = appointments.filter(a => a.status === 'cancelled').length;
        const noShowRate = args.current_no_show_rate || (total > 0 ? (noShows / total) * 100 : 15);

        // Cancellation patterns
        const cancelledAppts = appointments.filter(a => a.status === 'cancelled');
        const cancelLeadTimes: number[] = [];
        for (const a of cancelledAppts) {
          const created = new Date(a.createdAt).getTime();
          const scheduled = new Date(a.date).getTime();
          const leadHours = (scheduled - created) / 3600000;
          if (leadHours > 0) cancelLeadTimes.push(leadHours);
        }
        const avgCancelLead = cancelLeadTimes.length > 0
          ? Math.round(cancelLeadTimes.reduce((s, h) => s + h, 0) / cancelLeadTimes.length)
          : 24;

        const strategies: any = {};

        if (focus === 'reduce_no_shows' || focus === 'all') {
          strategies.reduccion_no_shows = {
            tasa_actual: `${noShowRate.toFixed(1)}%`,
            acciones: [
              {
                estrategia: 'Recordatorio WhatsApp automatizado',
                detalle: 'Enviar mensaje 24h antes y 2h antes de la cita con opción de confirmar/cancelar',
                impacto_estimado: 'Reduce no-shows 40-60%',
                implementacion: 'Configurar en herramienta de WhatsApp Business API o usar recordatorios manuales',
                costo: 'Bajo (solo tiempo de configuración)',
                template_mensaje_24h: '¡Hola {nombre}! Te recordamos tu cita mañana a las {hora} en Glamorapp. ¿Confirmas tu asistencia? Responde SI para confirmar.',
                template_mensaje_2h: '{nombre}, tu cita es en 2 horas. ¡Te esperamos! 💅✨',
              },
              {
                estrategia: 'Política de confirmación obligatoria',
                detalle: 'Requerir confirmación 12h antes o la cita se libera automáticamente',
                impacto_estimado: 'Reduce no-shows 30-40% adicional',
                implementacion: 'Activar en sistema de agenda: si no confirma, enviar alerta y liberar slot',
              },
              {
                estrategia: 'Cobro de anticipo para reincidentes',
                detalle: 'Clientes con 2+ no-shows deben pagar 30% de anticipo para agendar',
                impacto_estimado: 'Reduce reincidencia 70-80%',
                implementacion: 'Marcar clientes reincidentes y solicitar pago vía Nequi/Bancolombia/Daviplata',
              },
              {
                estrategia: 'Lista de espera automática',
                detalle: 'Clientes pueden inscribirse en lista de espera para slots cancelados. Notificación automática cuando se libera.',
                impacto_estimado: 'Recupera 50-60% de slots cancelados',
                implementacion: 'Formulario simple en WhatsApp o app',
              },
            ],
            prioridad: noShowRate > 15 ? 'URGENTE - Tasa de no-show crítica' :
              noShowRate > 8 ? 'ALTA - Implementar recordatorios ya' : 'MEDIA - Mantener y optimizar',
          };
        }

        if (focus === 'increase_occupancy' || focus === 'all') {
          strategies.aumento_ocupacion = {
            acciones: [
              {
                estrategia: 'Happy Hour de servicios',
                detalle: 'Descuento 20-30% en horarios valle (9-11am, 2-4pm) de martes a jueves',
                impacto_estimado: 'Aumenta ocupación en horas valle 30-50%',
                servicios_sugeridos: 'Manicure express, retoque de color, hidratación capilar rápida',
              },
              {
                estrategia: 'Paquetes de día específico',
                detalle: '"Martes de Belleza" o "Miércoles de Mimos" con paquete de 2 servicios a precio especial',
                impacto_estimado: 'Aumenta citas en días flojos 40-60%',
              },
              {
                estrategia: 'Overbooking controlado',
                detalle: 'Aceptar 1-2 citas extra en horas pico (10am-12pm, 3pm-6pm) asumiendo 15% de cancelación',
                impacto_estimado: 'Aumenta ocupación efectiva 10-15%',
                riesgo: 'Requiere buena gestión de tiempos para evitar esperas >10 min',
              },
              {
                estrategia: 'Campaña de referidos con incentivo',
                detalle: 'Cliente que refiere recibe 20% descuento; el referido recibe 15% en primera visita',
                impacto_estimado: 'Genera 5-10 citas nuevas por mes',
              },
            ],
          };
        }

        if (focus === 'optimize_gaps' || focus === 'all') {
          strategies.optimizacion_huecos = {
            problema: 'Huecos entre citas reducen eficiencia del profesional',
            acciones: [
              {
                estrategia: 'Bloques de citas consecutivas',
                detalle: 'Agendar servicios del mismo tipo en bloques consecutivos para profesional (ej: todos los tintes en la mañana, cortes en la tarde)',
                impacto: 'Reduce tiempos muertos de preparación/cambio',
              },
              {
                estrategia: 'Servicios express para huecos',
                detalle: 'Tener lista de servicios de 15-30 min para llenar huecos: retoque de uñas, hidratación express, cejas',
                impacto: 'Convierte huecos en ingresos',
              },
              {
                estrategia: 'Buffer inteligente entre citas',
                detalle: 'Dejar 5-10 min entre citas para limpieza y preparación. Usar ese tiempo para upselling de productos.',
              },
            ],
          };
        }

        if (focus === 'all') {
          strategies.resumen_ejecutivo = {
            tasa_no_show: `${noShowRate.toFixed(1)}%`,
            cancelaciones_90d: cancellations,
            anticipacion_promedio_cancelacion: `${avgCancelLead}h`,
            plan_accion_30_dias: [
              'Semana 1: Implementar recordatorios WhatsApp 24h y 2h antes',
              'Semana 2: Activar lista de espera y política de confirmación',
              'Semana 3: Lanzar "Happy Hour" en horas valle con promoción en redes',
              'Semana 4: Identificar clientes reincidentes e implementar política de anticipo',
            ],
            kpis_30_dias: {
              objetivo_no_show: `${Math.max(5, noShowRate - 5).toFixed(1)}%`,
              objetivo_ocupacion: '75-85%',
              ingresos_recuperados_estimados: Math.round(noShows * 35000 * 0.5),
            },
          };
        }

        return strategies;
      }

      case 'analyze_cancellation_patterns': {
        const days = args.period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 86400000);

        const appointments = await this.prisma.appointment.findMany({
          where: {
            tenantId: ctx.tenantId,
            storeId: ctx.storeId,
            date: { gte: since },
            status: { in: ['cancelled', 'completed', 'confirmed', 'no_show'] },
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
          orderBy: { date: 'desc' },
        });

        const cancelled = appointments.filter(a => a.status === 'cancelled');
        const total = appointments.length;
        const cancelRate = total > 0 ? ((cancelled.length / total) * 100).toFixed(1) : '0';

        // Lead time analysis
        const leadTimes = cancelled.map(a => {
          const created = new Date(a.createdAt).getTime();
          const scheduled = new Date(a.date).getTime();
          return (scheduled - created) / 3600000;
        }).filter(h => h > 0);

        const avgLeadTime = leadTimes.length > 0
          ? Math.round(leadTimes.reduce((s, h) => s + h, 0) / leadTimes.length)
          : 0;

        // Lead time distribution
        const leadTimeBuckets = {
          menos_6h: leadTimes.filter(h => h <= 6).length,
          '6_24h': leadTimes.filter(h => h > 6 && h <= 24).length,
          '24_48h': leadTimes.filter(h => h > 24 && h <= 48).length,
          mas_48h: leadTimes.filter(h => h > 48).length,
        };

        // By customer
        const customerCancelMap: Record<string, { name: string; total: number; cancelled: number }> = {};
        for (const a of appointments) {
          const cid = a.customer?.id || 'unknown';
          if (!customerCancelMap[cid]) {
            customerCancelMap[cid] = {
              name: [a.customer?.firstName, a.customer?.lastName].filter(Boolean).join(' ') || 'Desconocido',
              total: 0,
              cancelled: 0,
            };
          }
          customerCancelMap[cid].total++;
          if (a.status === 'cancelled') customerCancelMap[cid].cancelled++;
        }

        const frequentCancellers = Object.values(customerCancelMap)
          .filter(c => c.cancelled >= 2)
          .map(c => ({
            ...c,
            tasa_cancelacion: `${((c.cancelled / c.total) * 100).toFixed(1)}%`,
          }))
          .sort((a, b) => b.cancelled - a.cancelled);

        // By day of week
        const cancelByDay: Record<number, { total: number; cancelled: number }> = {};
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        for (const a of appointments) {
          const day = new Date(a.date).getDay();
          if (!cancelByDay[day]) cancelByDay[day] = { total: 0, cancelled: 0 };
          cancelByDay[day].total++;
          if (a.status === 'cancelled') cancelByDay[day].cancelled++;
        }

        const cancelByDayAnalysis = Object.entries(cancelByDay).map(([day, data]) => ({
          dia: dayNames[Number(day)],
          total: data.total,
          canceladas: data.cancelled,
          tasa: data.total > 0 ? `${((data.cancelled / data.total) * 100).toFixed(1)}%` : '0%',
        }));

        // Lost revenue
        const avgPrice = appointments
          .filter(a => a.status === 'completed')
          .reduce((s, a) => s + Number(a.price || 0), 0) / Math.max(1, appointments.filter(a => a.status === 'completed').length);

        const lostRevenue = Math.round(cancelled.length * (avgPrice || 35000));

        return {
          periodo: `${days} días`,
          total_citas: total,
          canceladas: cancelled.length,
          tasa_cancelacion: `${cancelRate}%`,
          tiempo_anticipacion: {
            promedio_horas: avgLeadTime,
            distribucion: leadTimeBuckets,
            interpretacion: avgLeadTime < 12
              ? 'La mayoría de cancelaciones son de último momento (<12h). Urge política de cancelación y lista de espera ágil.'
              : avgLeadTime < 24
                ? 'Cancelaciones con anticipación moderada. Lista de espera puede recuperar mayoría de slots.'
                : 'Cancelaciones con buena anticipación. Fácil de reasignar slots.',
          },
          ingreso_perdido: {
            estimado: lostRevenue,
            por_cita: Math.round(avgPrice || 35000),
          },
          clientes_frecuentes_cancelacion: frequentCancellers.slice(0, 10),
          por_dia: cancelByDayAnalysis,
          estrategias: [
            'Política de cancelación: solicitar 6-12h de anticipación para evitar cobro',
            'Si cancelan <6h antes: ofrecer reagendar sin costo la primera vez, luego cobrar 30%',
            'Activar lista de espera con notificación automática al liberarse un slot',
            'Para clientes con 3+ cancelaciones: requerir prepago del 50%',
            'Enviar recordatorio de política de cancelación en el mensaje de confirmación',
          ],
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async queryUpcomingAppointments(tenantId: string, storeId: string, days: number = 7) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 86400000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        storeId,
        date: { gte: now, lt: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const byDay: Record<string, number> = {};
    for (const a of appointments) {
      const day = new Date(a.date).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      byDay: Object.entries(byDay).map(([date, count]) => ({
        fecha: date,
        dia: new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long' }),
        citas: count,
      })),
    };
  }
}
