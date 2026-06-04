'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScopeGate } from '@/hooks/use-plan-gate';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/constants';
import {
  CalendarCheck, Clock, CheckCircle, DollarSign, Plus, ChevronLeft, ChevronRight,
  User, Scissors, X, Save, Loader2, Search, Phone, AlertCircle,
  Play, Square, Ban, UserX
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type ViewMode = 'day' | 'week' | 'month';

interface AppointmentForm {
  customerId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes: string;
  price: string;
}

const emptyForm: AppointmentForm = {
  customerId: '',
  professionalId: '',
  serviceId: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '',
  notes: '',
  price: '',
};

// ─── Status helpers ─────────────────────────────────────────────────
const NEXT_STATUS: Record<string, { label: string; status: AppointmentStatus; icon: React.ReactNode; color: string }[]> = {
  pending: [
    { label: 'Confirmar', status: 'confirmed', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 hover:bg-green-50' },
    { label: 'Cancelar', status: 'cancelled', icon: <Ban className="w-4 h-4" />, color: 'text-red-600 hover:bg-red-50' },
  ],
  confirmed: [
    { label: 'Iniciar', status: 'in_progress', icon: <Play className="w-4 h-4" />, color: 'text-blue-600 hover:bg-blue-50' },
    { label: 'Cancelar', status: 'cancelled', icon: <Ban className="w-4 h-4" />, color: 'text-red-600 hover:bg-red-50' },
    { label: 'No asistió', status: 'no_show', icon: <UserX className="w-4 h-4" />, color: 'text-orange-600 hover:bg-orange-50' },
  ],
  in_progress: [
    { label: 'Completar', status: 'completed', icon: <Square className="w-4 h-4" />, color: 'text-green-600 hover:bg-green-50' },
  ],
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', in_progress: 'En progreso',
  completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
};

// ─── Calendar helpers ───────────────────────────────────────────────
const HOURS = Array.from({ length: 11 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 8am-6pm
const HOUR_HEIGHT = 60; // px per hour

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getDaysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
  const days: (Date | null)[] = [];

  // Padding before first day
  for (let i = 0; i < startPad; i++) days.push(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad to complete last row
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function parseDateStr(d: any): Date {
  if (typeof d === 'string') {
    const datePart = d.split('T')[0]; // "2026-05-26" from any ISO format
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(d);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── Overlap-aware layout ──────────────────────────────────────────
// Classic calendar algorithm: distribute overlapping appointments into parallel columns

interface LayoutAppointment {
  startMin: number;
  endMin: number;
  _col: number;
  _cols: number;
}

function layoutAppointments(appointments: any[]): any[] {
  if (appointments.length === 0) return [];

  // Sort by start time
  const sorted = [...appointments].sort((a, b) =>
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  // Build overlap groups using a simple pass
  const groups: any[][] = [];
  let currentGroup: any[] = [sorted[0]];
  let groupEndMin = timeToMinutes(sorted[0].endTime);

  for (let i = 1; i < sorted.length; i++) {
    const startMin = timeToMinutes(sorted[i].startTime);
    if (startMin < groupEndMin) {
      // Overlaps with group → add to current group
      currentGroup.push(sorted[i]);
      groupEndMin = Math.max(groupEndMin, timeToMinutes(sorted[i].endTime));
    } else {
      // No overlap → finalize group, start new one
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
      groupEndMin = timeToMinutes(sorted[i].endTime);
    }
  }
  groups.push(currentGroup);

  // Assign columns within each group (greedy: find first available column)
  const result: any[] = [];
  for (const group of groups) {
    const columns: number[] = []; // endMin of last appointment in each column

    for (const appt of group) {
      const startMin = timeToMinutes(appt.startTime);
      let col = 0;
      // Find first column where we don't overlap
      while (col < columns.length && columns[col] > startMin) {
        col++;
      }
      // Place appointment in this column
      appt._col = col;
      if (col >= columns.length) {
        columns.push(timeToMinutes(appt.endTime));
      } else {
        columns[col] = timeToMinutes(appt.endTime);
      }
    }

    // Assign total columns count
    const totalCols = columns.length;
    for (const appt of group) {
      appt._cols = totalCols;
    }

    result.push(...group);
  }

  return result;
}

function getAppointmentStyle(appt: any): React.CSSProperties {
  const startMin = timeToMinutes(appt.startTime);
  const endMin = timeToMinutes(appt.endTime);
  const top = ((startMin - 8 * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);

  // Column layout: distribute overlapping appointments side-by-side
  const col = appt._col ?? 0;
  const cols = appt._cols ?? 1;
  // Simple calc: each column gets 100/cols % width, with a 4px gap
  const widthPct = 100 / cols;
  const leftPct = col * widthPct;

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
  };
}

// ─── Appointment item (compact, used inside day/week columns) ──────
function AppointmentBlock({ a, onClick }: { a: any; onClick: (a: any) => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(a); }}
      className="absolute rounded-lg px-2 py-1 cursor-pointer hover:brightness-95 transition shadow-sm border border-white/20 overflow-hidden z-10"
      style={{
        backgroundColor: `${a.service?.color || '#EF2D8F'}15`,
        borderLeft: `3px solid ${a.service?.color || '#EF2D8F'}`,
        ...getAppointmentStyle(a),
      }}
    >
      <p className="text-xs font-semibold text-foreground truncate leading-tight">
        {a.customer?.firstName} {a.customer?.lastName}
      </p>
      <p className="text-[10px] text-muted-foreground truncate leading-tight">
        {a.service?.name}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {a.startTime?.slice(0, 5)} — {a.endTime?.slice(0, 5)}
      </p>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════
export default function AppointmentsPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [loading, setLoading] = useState(true);
  const [professionalFilter, setProfessionalFilter] = useState<string>(''); // admin-only filter

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Selectors data
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelApptId, setCancelApptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Detail sidebar
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // ─── Computed dates per view ──────────────────────────────────────
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekDays = useMemo(() => getDaysOfWeek(weekStart), [weekStart]);
  const monthDays = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  // ─── Fetch appointments ───────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      if (viewMode === 'day') {
        url = `/appointments?date=${formatDateStr(currentDate)}&limit=100`;
      } else if (viewMode === 'week') {
        url = `/appointments?startDate=${formatDateStr(weekStart)}&endDate=${formatDateStr(weekEnd)}&limit=200`;
      } else {
        // month: fetch full month range
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        url = `/appointments?startDate=${formatDateStr(monthStart)}&endDate=${formatDateStr(monthEnd)}&limit=500`;
      }
      // Admin professional filter
      if (professionalFilter) {
        url += `&professionalId=${professionalFilter}`;
      }
      const res = await api.get(url, { token: token! });
      setAppointments(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentDate, viewMode, weekStart, weekEnd, token, professionalFilter]);

  useEffect(() => {
    if (!token) return;
    fetchAppointments();
  }, [fetchAppointments, token]);

  // ─── Fetch selectors ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.get('/users?role=professional&limit=50', { token })
      .then(res => setProfessionals(res.data || []))
      .catch(() => {});
    api.get('/services?limit=100', { token })
      .then(res => setServices((res.data || []).filter((s: any) => s.isActive)))
      .catch(() => {});
  }, [token]);

  // ─── Customer search ──────────────────────────────────────────────
  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    setSearchingCustomers(true);
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=8`, { token: token! });
      setCustomers(res.data || []);
      setShowCustomerDropdown(true);
    } catch { setCustomers([]); }
    finally { setSearchingCustomers(false); }
  };

  // ─── Available slots ──────────────────────────────────────────────
  const fetchSlots = async () => {
    if (!form.professionalId || !form.date || !form.serviceId) return;
    setLoadingSlots(true);
    try {
      const svc = services.find(s => s.id === form.serviceId);
      const duration = svc?.durationMinutes || 60;
      const res = await api.get(
        `/appointments/available-slots?date=${form.date}&professionalId=${form.professionalId}&duration=${duration}`,
        { token: token! }
      );
      setAvailableSlots(Array.isArray(res) ? res : res.data || []);
    } catch { setAvailableSlots([]); }
    finally { setLoadingSlots(false); }
  };

  useEffect(() => { fetchSlots(); }, [form.professionalId, form.date, form.serviceId]); // eslint-disable-line

  // ─── Navigation ───────────────────────────────────────────────────
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ─── Form handlers ────────────────────────────────────────────────
  const openNewModal = (prefillDate?: string, prefillTime?: string) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      date: prefillDate || formatDateStr(currentDate),
      startTime: prefillTime || '',
    });
    setFormError('');
    setCustomerSearch('');
    setCustomers([]);
    setAvailableSlots([]);
    setShowModal(true);
  };

  const openEditModal = (a: any) => {
    setEditingId(a.id);
    setForm({
      customerId: a.customerId || '',
      professionalId: a.professionalId || '',
      serviceId: a.serviceId || '',
      date: a.date?.split('T')[0] || formatDateStr(currentDate),
      startTime: a.startTime?.slice(0, 5) || '',
      notes: a.notes || '',
      price: String(a.price || ''),
    });
    setFormError('');
    setCustomerSearch(a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : '');
    setShowModal(true);
    setSelectedAppt(null);
  };

  const handleServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    setForm(prev => ({
      ...prev,
      serviceId,
      price: svc ? String(svc.price) : prev.price,
    }));
  };

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerId: c.id }));
    setCustomerSearch(`${c.firstName} ${c.lastName}`);
    setCustomers([]);
    setShowCustomerDropdown(false);
  };

  const calculateEndTime = (start: string, serviceId: string): string => {
    const svc = services.find(s => s.id === serviceId);
    const minutes = svc?.durationMinutes || 60;
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!form.customerId) return setFormError('Selecciona un cliente');
    if (!form.professionalId) return setFormError('Selecciona un profesional');
    if (!form.serviceId) return setFormError('Selecciona un servicio');
    if (!form.startTime) return setFormError('Selecciona una hora');
    setSaving(true);
    setFormError('');
    try {
      const body = {
        customerId: form.customerId,
        professionalId: form.professionalId,
        serviceId: form.serviceId,
        date: form.date,
        startTime: form.startTime,
        endTime: calculateEndTime(form.startTime, form.serviceId),
        price: parseFloat(form.price) || 0,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await api.put(`/appointments/${editingId}`, body, { token: token! });
      } else {
        await api.post('/appointments', body, { token: token! });
      }
      setShowModal(false);
      fetchAppointments();
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Status change ────────────────────────────────────────────────
  const changeStatus = async (id: string, status: AppointmentStatus, reason?: string) => {
    try {
      const endpointMap: Record<string, string> = {
        confirmed: 'confirm', in_progress: 'start', completed: 'complete',
        cancelled: 'cancel', no_show: 'no-show',
      };
      const endpoint = endpointMap[status];
      const body = status === 'cancelled' && reason ? { reason } : undefined;
      await api.post(`/appointments/${id}/${endpoint}`, body || {}, { token: token! });
      fetchAppointments();
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppt(null);
    } catch (e: any) {
      alert('No se pudo cambiar el estado. Intenta de nuevo.');
    }
  };

  const openCancelModal = (id: string) => {
    setCancelApptId(id);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // ─── Stats ────────────────────────────────────────────────────────
  const visibleApps = useMemo(() => {
    if (viewMode === 'day') return appointments;
    if (viewMode === 'week') {
      return appointments.filter(a => {
        const d = parseDateStr(a.date);
        return d >= weekStart && d <= weekEnd;
      });
    }
    return appointments;
  }, [appointments, viewMode, weekStart, weekEnd]);

  const confirmed = visibleApps.filter(a => a.status === 'confirmed').length;
  const completed = visibleApps.filter(a => a.status === 'completed').length;
  const pending = visibleApps.filter(a => a.status === 'pending').length;
  const revenue = visibleApps.filter(a => a.status === 'completed').reduce((s, a) => s + Number(a.price || 0), 0);

  // ─── Header title ─────────────────────────────────────────────────
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = weekStart.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      const end = weekEnd.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} — ${end}`;
    }
    return currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekStart, weekEnd]);

  const isToday = (d: Date) => sameDay(d, new Date());

  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamiento</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{headerTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex bg-surface-primary rounded-lg border border-border-primary p-0.5 mr-2">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === mode
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          {/* Admin: professional filter */}
          {isAdmin && (
            <select
              value={professionalFilter}
              onChange={e => setProfessionalFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition mr-2 max-w-[180px]"
            >
              <option value="">Todos los profesionales</option>
              {professionals.map((p: any) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          )}
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-border-primary hover:bg-surface-hover">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToday} className="px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium">Hoy</button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-border-primary hover:bg-surface-hover">
            <ChevronRight className="w-5 h-5" />
          </button>
          <ScopeGate module="appointments" action="create">
            <button onClick={() => openNewModal()} className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium ml-4">
              <Plus className="w-4 h-4" /> Nueva cita
            </button>
          </ScopeGate>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4 shrink-0">
        <StatCard title="Total" value={String(visibleApps.length)} icon={<CalendarCheck className="w-5 h-5 text-glamor-primary" />} />
        <StatCard title="Confirmadas" value={String(confirmed)} icon={<CheckCircle className="w-5 h-5 text-green-500" />} />
        <StatCard title="Pendientes" value={String(pending)} icon={<Clock className="w-5 h-5 text-orange-500" />} />
        <StatCard title="Completadas" value={String(completed)} icon={<CheckCircle className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Ingresos" value={formatCurrency(revenue)} icon={<DollarSign className="w-5 h-5 text-green-500" />} />
      </div>

      {/* ─── Calendar view ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-border-primary overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                appointments={appointments}
                onClickAppt={setSelectedAppt}
                onClickSlot={(time) => openNewModal(formatDateStr(currentDate), time)}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                weekDays={weekDays}
                appointments={appointments}
                onClickAppt={setSelectedAppt}
                onClickSlot={(date, time) => openNewModal(formatDateStr(date), time)}
              />
            )}
            {viewMode === 'month' && (
              <MonthView
                monthDays={monthDays}
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                appointments={appointments}
                currentDate={currentDate}
                onClickDay={(date) => { setCurrentDate(date); setViewMode('day'); }}
                onClickAppt={setSelectedAppt}
                onNewAppt={(date) => openNewModal(formatDateStr(date))}
              />
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         APPOINTMENT DETAIL SIDEBAR
         ═══════════════════════════════════════════════════════════ */}
      {selectedAppt && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedAppt(null)} />
          <div className="relative w-96 bg-white shadow-2xl h-full overflow-auto animate-slide-left">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
              <h3 className="font-bold text-foreground">Detalle de cita</h3>
              <button onClick={() => setSelectedAppt(null)} className="p-1.5 rounded-lg hover:bg-surface-hover">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedAppt.status} colors={APPOINTMENT_STATUS_COLORS} labels={STATUS_LABEL} />
                {selectedAppt.status === 'cancelled' && selectedAppt.cancelReason && (
                  <span className="text-xs text-red-500">— {selectedAppt.cancelReason}</span>
                )}
              </div>

              {/* Customer */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-primary/50">
                <div className="w-10 h-10 rounded-full bg-glamor-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-glamor-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedAppt.customer?.firstName} {selectedAppt.customer?.lastName}</p>
                  {selectedAppt.customer?.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedAppt.customer.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Service info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scissors className="w-4 h-4" />
                  <span className="font-medium text-foreground">{selectedAppt.service?.name}</span>
                  <span className="ml-auto font-semibold">{formatCurrency(selectedAppt.price)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{selectedAppt.professional?.firstName} {selectedAppt.professional?.lastName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{parseDateStr(selectedAppt.date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{selectedAppt.startTime?.slice(0, 5)} — {selectedAppt.endTime?.slice(0, 5)} ({selectedAppt.service?.durationMinutes || 60} min)</span>
                </div>
              </div>

              {selectedAppt.notes && (
                <div className="p-3 rounded-lg bg-surface-primary/50 text-sm text-muted-foreground">
                  {selectedAppt.notes}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-border-primary">
                {['pending', 'confirmed'].includes(selectedAppt.status) && (
                  <button onClick={() => openEditModal(selectedAppt)}
                    className="w-full h-10 rounded-lg border border-border-primary text-sm font-medium hover:bg-surface-hover transition flex items-center justify-center gap-2">
                    <Scissors className="w-4 h-4" /> Editar cita
                  </button>
                )}
                {(NEXT_STATUS[selectedAppt.status] || []).map(btn => (
                  <button
                    key={btn.status}
                    onClick={() => btn.status === 'cancelled' ? openCancelModal(selectedAppt.id) : changeStatus(selectedAppt.id, btn.status)}
                    className={`w-full h-10 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 ${btn.color}`}
                  >
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         CREATE / EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar cita' : 'Nueva cita'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* Customer */}
              <div className="relative">
                <label className={labelClass}>Cliente *</label>
                {form.customerId ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-glamor-primary/40 bg-glamor-primary/5 text-sm">
                    <User className="w-4 h-4 text-glamor-primary" />
                    <span className="flex-1 font-medium">{customerSearch}</span>
                    <button onClick={() => { setForm(prev => ({ ...prev, customerId: '' })); setCustomerSearch(''); }}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={customerSearch}
                        onChange={e => searchCustomers(e.target.value)}
                        onFocus={() => customers.length > 0 && setShowCustomerDropdown(true)}
                        placeholder="Buscar cliente por nombre..."
                        className={`${inputClass} pl-9`}
                      />
                      {searchingCustomers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    {showCustomerDropdown && customers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-lg border border-border-primary shadow-lg max-h-48 overflow-auto">
                        {customers.map((c: any) => (
                          <button key={c.id} onClick={() => selectCustomer(c)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{c.firstName} {c.lastName}</span>
                            {c.phone && <span className="text-xs text-muted-foreground ml-auto">{c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Professional + Service */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Profesional *</label>
                  <select className={inputClass} value={form.professionalId}
                    onChange={e => setForm(prev => ({ ...prev, professionalId: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {professionals.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Servicio *</label>
                  <select className={inputClass} value={form.serviceId} onChange={e => handleServiceChange(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha *</label>
                  <input type="date" className={inputClass} value={form.date}
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Hora *</label>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando slots...
                    </div>
                  ) : availableSlots.length === 0 && form.professionalId && form.serviceId ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" /> Sin slots disponibles
                    </div>
                  ) : (
                    <select className={inputClass} value={form.startTime}
                      onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {HOURS.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className={labelClass}>Precio</label>
                <input type="number" step="0.01" min="0" className={`${inputClass} w-40`} value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} />
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notas</label>
                <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowModal(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         CANCEL MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Cancelar cita</h3>
            <p className="text-sm text-muted-foreground mb-4">¿Por qué se cancela esta cita?</p>
            <textarea className={`${inputClass} h-20 py-2 resize-none mb-4`} value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover">
                Volver
              </button>
              <button onClick={() => cancelApptId && changeStatus(cancelApptId, 'cancelled', cancelReason)}
                className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════════════════════════
function DayView({
  currentDate, appointments, onClickAppt, onClickSlot,
}: {
  currentDate: Date;
  appointments: any[];
  onClickAppt: (a: any) => void;
  onClickSlot: (time: string) => void;
}) {
  const dayApps = appointments.filter(a => {
    const d = parseDateStr(a.date);
    return sameDay(d, currentDate);
  });

  return (
    <div className="flex h-full overflow-auto">
      {/* Time labels */}
      <div className="w-16 shrink-0 border-r border-border-primary">
        {HOURS.map(hour => (
          <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
            <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground">{hour}</span>
          </div>
        ))}
      </div>

      {/* Appointments area */}
      <div className="flex-1 relative min-w-0">
        {/* Hour grid lines */}
        {HOURS.map(hour => (
          <div
            key={hour}
            className="border-t border-border-primary/50"
            style={{ height: HOUR_HEIGHT }}
            onClick={() => onClickSlot(hour)}
          />
        ))}

        {/* Appointment blocks */}
        {layoutAppointments(dayApps).map(a => (
          <AppointmentBlock key={a.id} a={a} onClick={onClickAppt} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════════════════════════
function WeekView({
  weekDays, appointments, onClickAppt, onClickSlot,
}: {
  weekDays: Date[];
  appointments: any[];
  onClickAppt: (a: any) => void;
  onClickSlot: (date: Date, time: string) => void;
}) {
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getAppsForDay = (day: Date) =>
    appointments.filter(a => sameDay(parseDateStr(a.date), day));

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Day headers */}
      <div className="flex border-b border-border-primary shrink-0">
        <div className="w-16 shrink-0" />
        {weekDays.map((day, i) => {
          const today = sameDay(day, new Date());
          return (
            <div
              key={i}
              className={`flex-1 text-center py-2 border-l border-border-primary ${
                today ? 'bg-glamor-primary/5' : ''
              }`}
            >
              <p className="text-xs text-muted-foreground">{dayNames[i]}</p>
              <p className={`text-lg font-semibold ${today ? 'text-glamor-primary' : 'text-foreground'}`}>
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex flex-1">
        {/* Time labels */}
        <div className="w-16 shrink-0">
          {HOURS.map(hour => (
            <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground">{hour}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, dayIdx) => {
          const dayApps = getAppsForDay(day);
          const today = sameDay(day, new Date());
          return (
            <div
              key={dayIdx}
              className={`flex-1 relative border-l border-border-primary ${today ? 'bg-glamor-primary/[0.02]' : ''}`}
            >
              {/* Hour grid lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="border-t border-border-primary/30"
                  style={{ height: HOUR_HEIGHT }}
                  onClick={() => onClickSlot(day, hour)}
                />
              ))}

              {/* Appointments */}
              {layoutAppointments(dayApps).map(a => (
                <AppointmentBlock key={a.id} a={a} onClick={onClickAppt} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════════
function MonthView({
  monthDays, year, month, appointments, currentDate, onClickDay, onClickAppt, onNewAppt,
}: {
  monthDays: (Date | null)[];
  year: number;
  month: number;
  appointments: any[];
  currentDate: Date;
  onClickDay: (date: Date) => void;
  onClickAppt: (a: any) => void;
  onNewAppt: (date: Date) => void;
}) {
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const isToday = (d: Date) => sameDay(d, new Date());
  const isCurrentMonth = (d: Date) => d.getMonth() === month && d.getFullYear() === year;

  const getAppsForDay = (day: Date) =>
    appointments.filter(a => sameDay(parseDateStr(a.date), day)).slice(0, 3);

  return (
    <div className="h-full flex flex-col">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-border-primary shrink-0">
        {dayNames.map(name => (
          <div key={name} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border-primary last:border-r-0">
            {name}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {monthDays.map((day, i) => (
          <div
            key={i}
            className={`border-r border-b border-border-primary p-1 min-h-[80px] flex flex-col ${
              day && isToday(day) ? 'bg-glamor-primary/5' : ''
            } ${day && !isCurrentMonth(day) ? 'opacity-40' : ''}`}
          >
            {day && (
              <>
                {/* Day header */}
                <div className="flex items-center justify-between mb-0.5">
                  <button
                    onClick={() => onClickDay(day)}
                    className={`w-7 h-7 rounded-full text-sm font-semibold flex items-center justify-center hover:bg-surface-hover transition ${
                      isToday(day) ? 'bg-glamor-primary text-white hover:bg-glamor-primary-hover' : 'text-foreground'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                  <ScopeGate module="appointments" action="create">
                    <button
                      onClick={(e) => { e.stopPropagation(); onNewAppt(day); }}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded hover:bg-glamor-primary/10 text-muted-foreground hover:text-glamor-primary transition"
                      title="Nueva cita"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </ScopeGate>
                </div>

                {/* Appointments */}
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {getAppsForDay(day).map(a => (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); onClickAppt(a); }}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate hover:brightness-95 transition"
                      style={{
                        backgroundColor: `${a.service?.color || '#EF2D8F'}18`,
                        borderLeft: `2px solid ${a.service?.color || '#EF2D8F'}`,
                        color: 'var(--foreground)',
                      }}
                    >
                      <span className="font-medium">{a.startTime?.slice(0, 5)}</span>{' '}
                      {a.customer?.firstName}
                    </button>
                  ))}
                  {appointments.filter(a => sameDay(parseDateStr(a.date), day)).length > 3 && (
                    <p className="text-[10px] text-muted-foreground px-1.5">
                      +{appointments.filter(a => sameDay(parseDateStr(a.date), day)).length - 3} más
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
