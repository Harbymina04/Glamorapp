/**
 * Catálogo de países de Latinoamérica con sus ajustes regionales por defecto.
 * Agregar un país = agregar una entrada aquí. Lo consume el módulo de
 * Configuración (selector de país) y el registro de nuevos negocios.
 *
 * taxType se mantiene como 'iva' (categoría interna de IVA/valor agregado);
 * lo que varía entre países es el NOMBRE visible (IVA, IGV, ITBMS...) y la tasa.
 */
export interface CountryPreset {
  code: string;            // ISO 3166-1 alpha-2
  name: string;            // Nombre visible
  flag: string;            // Emoji bandera
  currency: string;        // ISO 4217
  currencySymbol: string;  // Símbolo
  timezone: string;        // Zona horaria IANA principal
  dialCode: string;        // Indicativo telefónico
  locale: string;          // BCP-47
  taxName: string;         // Nombre del impuesto al valor agregado
  taxRate: number;         // Tasa general por defecto (%)
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  { code: 'CO', name: 'Colombia',             flag: '🇨🇴', currency: 'COP', currencySymbol: '$',   timezone: 'America/Bogota',                    dialCode: '+57',  locale: 'es-CO', taxName: 'IVA',   taxRate: 19 },
  { code: 'MX', name: 'México',               flag: '🇲🇽', currency: 'MXN', currencySymbol: '$',   timezone: 'America/Mexico_City',               dialCode: '+52',  locale: 'es-MX', taxName: 'IVA',   taxRate: 16 },
  { code: 'PE', name: 'Perú',                 flag: '🇵🇪', currency: 'PEN', currencySymbol: 'S/',  timezone: 'America/Lima',                      dialCode: '+51',  locale: 'es-PE', taxName: 'IGV',   taxRate: 18 },
  { code: 'CL', name: 'Chile',                flag: '🇨🇱', currency: 'CLP', currencySymbol: '$',   timezone: 'America/Santiago',                  dialCode: '+56',  locale: 'es-CL', taxName: 'IVA',   taxRate: 19 },
  { code: 'AR', name: 'Argentina',            flag: '🇦🇷', currency: 'ARS', currencySymbol: '$',   timezone: 'America/Argentina/Buenos_Aires',    dialCode: '+54',  locale: 'es-AR', taxName: 'IVA',   taxRate: 21 },
  { code: 'EC', name: 'Ecuador',              flag: '🇪🇨', currency: 'USD', currencySymbol: '$',   timezone: 'America/Guayaquil',                 dialCode: '+593', locale: 'es-EC', taxName: 'IVA',   taxRate: 15 },
  { code: 'BO', name: 'Bolivia',              flag: '🇧🇴', currency: 'BOB', currencySymbol: 'Bs',  timezone: 'America/La_Paz',                    dialCode: '+591', locale: 'es-BO', taxName: 'IVA',   taxRate: 13 },
  { code: 'PY', name: 'Paraguay',             flag: '🇵🇾', currency: 'PYG', currencySymbol: '₲',   timezone: 'America/Asuncion',                  dialCode: '+595', locale: 'es-PY', taxName: 'IVA',   taxRate: 10 },
  { code: 'UY', name: 'Uruguay',              flag: '🇺🇾', currency: 'UYU', currencySymbol: '$',   timezone: 'America/Montevideo',                dialCode: '+598', locale: 'es-UY', taxName: 'IVA',   taxRate: 22 },
  { code: 'VE', name: 'Venezuela',            flag: '🇻🇪', currency: 'VES', currencySymbol: 'Bs',  timezone: 'America/Caracas',                   dialCode: '+58',  locale: 'es-VE', taxName: 'IVA',   taxRate: 16 },
  { code: 'CR', name: 'Costa Rica',           flag: '🇨🇷', currency: 'CRC', currencySymbol: '₡',   timezone: 'America/Costa_Rica',                dialCode: '+506', locale: 'es-CR', taxName: 'IVA',   taxRate: 13 },
  { code: 'PA', name: 'Panamá',               flag: '🇵🇦', currency: 'USD', currencySymbol: '$',   timezone: 'America/Panama',                    dialCode: '+507', locale: 'es-PA', taxName: 'ITBMS', taxRate: 7 },
  { code: 'GT', name: 'Guatemala',            flag: '🇬🇹', currency: 'GTQ', currencySymbol: 'Q',   timezone: 'America/Guatemala',                 dialCode: '+502', locale: 'es-GT', taxName: 'IVA',   taxRate: 12 },
  { code: 'HN', name: 'Honduras',             flag: '🇭🇳', currency: 'HNL', currencySymbol: 'L',   timezone: 'America/Tegucigalpa',               dialCode: '+504', locale: 'es-HN', taxName: 'ISV',   taxRate: 15 },
  { code: 'SV', name: 'El Salvador',          flag: '🇸🇻', currency: 'USD', currencySymbol: '$',   timezone: 'America/El_Salvador',               dialCode: '+503', locale: 'es-SV', taxName: 'IVA',   taxRate: 13 },
  { code: 'NI', name: 'Nicaragua',            flag: '🇳🇮', currency: 'NIO', currencySymbol: 'C$',  timezone: 'America/Managua',                   dialCode: '+505', locale: 'es-NI', taxName: 'IVA',   taxRate: 15 },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', currency: 'DOP', currencySymbol: 'RD$', timezone: 'America/Santo_Domingo',             dialCode: '+1',   locale: 'es-DO', taxName: 'ITBIS', taxRate: 18 },
];

/** Devuelve el preset por código ISO; si no existe, Colombia por defecto. */
export function getCountryPreset(code?: string | null): CountryPreset {
  const c = (code || '').toUpperCase();
  return COUNTRY_PRESETS.find(p => p.code === c) ?? COUNTRY_PRESETS[0];
}
