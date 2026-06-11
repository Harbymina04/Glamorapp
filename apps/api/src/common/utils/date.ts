/**
 * Suma meses a una fecha, ajustando ("clamp") el día al último día válido del
 * mes destino. Evita el desbordamiento de `new Date(y, m+1, d)` cuando el día
 * no existe en el mes destino (p. ej. 31 ene + 1 mes → 28/29 feb, no 3 mar).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1); // evita rollover al cambiar el mes
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Suma años a una fecha con el mismo clamp de día (maneja 29 feb → 28 feb).
 */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}
