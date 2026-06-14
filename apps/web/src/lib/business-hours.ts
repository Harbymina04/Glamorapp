// Horario de atención del salón. Forma almacenada (Json en Store.businessHours):
//   { mon: { closed, open: 'HH:MM', close: 'HH:MM' }, tue: {...}, ... sun }
// open/close en 24h. Si falta el día o closed=true → cerrado ese día.

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface DayHours { closed?: boolean; open?: string; close?: string }
export type BusinessHours = Partial<Record<DayKey, DayHours>>;

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

// Mercado Colombia: si no hay zona horaria configurada, usamos Bogotá.
const DEFAULT_TZ = 'America/Bogota';

// JS getDay(): 0=domingo..6=sábado → nuestras claves
const JS_DAY_TO_KEY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function defaultBusinessHours(): BusinessHours {
  const h: BusinessHours = {};
  (['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[]).forEach(k => {
    h[k] = { closed: false, open: '09:00', close: '18:00' };
  });
  h.sun = { closed: true };
  return h;
}

/** Día y minutos del momento actual en la zona horaria dada. */
function nowInTz(tz: string): { dayKey: DayKey; minutes: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const wd = parts.find(p => p.type === 'weekday')?.value ?? '';
    const hh = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const mm = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    const map: Record<string, DayKey> = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
    const dayKey = map[wd];
    if (!dayKey) return null;
    return { dayKey, minutes: hh * 60 + (Number.isFinite(mm) ? mm : 0) };
  } catch {
    return null;
  }
}

function toMinutes(hhmm?: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** ¿Está abierto ahora? null si no hay horario configurado. */
export function isOpenNow(hours?: BusinessHours | null, tz?: string | null): boolean | null {
  if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return null;
  const now = nowInTz(tz || DEFAULT_TZ);
  if (!now) return null;
  const today = hours[now.dayKey];
  if (!today || today.closed) {
    // Quizá un turno nocturno del día anterior siga abierto pasada la medianoche
    const prevKey = JS_DAY_TO_KEY[(JS_DAY_TO_KEY.indexOf(now.dayKey) + 6) % 7];
    const prev = hours[prevKey];
    if (prev && !prev.closed) {
      const o = toMinutes(prev.open); const c = toMinutes(prev.close);
      if (o != null && c != null && c < o && now.minutes < c) return true;
    }
    return false;
  }
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (open == null || close == null) return false;
  if (close < open) return now.minutes >= open || now.minutes < close; // cruza medianoche
  return now.minutes >= open && now.minutes < close;
}

function to12h(hhmm?: string): string {
  const min = toMinutes(hhmm);
  if (min == null) return '';
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? 'a.m.' : 'p.m.';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Texto del horario de HOY: "9:00 a.m. – 6:00 p.m." o "Cerrado hoy". null si no hay datos. */
export function todayHoursLabel(hours?: BusinessHours | null, tz?: string | null): string | null {
  if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return null;
  const now = nowInTz(tz || DEFAULT_TZ);
  if (!now) return null;
  const today = hours[now.dayKey];
  if (!today || today.closed || !today.open || !today.close) return 'Cerrado hoy';
  return `${to12h(today.open)} – ${to12h(today.close)}`;
}
