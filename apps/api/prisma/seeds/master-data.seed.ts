/**
 * Seed: Datos maestros globales
 * Ejecutar: npx ts-node prisma/seeds/master-data.seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Países ──────────────────────────────────────────────────────

const COUNTRIES = [
  { isoCode: 'CO', name: 'Colombia',         dialCode: '+57',  flag: '🇨🇴', sortOrder: 1 ,  translations: { es: 'Colombia',         en: 'Colombia' } },
  { isoCode: 'MX', name: 'México',            dialCode: '+52',  flag: '🇲🇽', sortOrder: 2,   translations: { es: 'México',            en: 'Mexico' } },
  { isoCode: 'VE', name: 'Venezuela',         dialCode: '+58',  flag: '🇻🇪', sortOrder: 3,   translations: { es: 'Venezuela',         en: 'Venezuela' } },
  { isoCode: 'EC', name: 'Ecuador',           dialCode: '+593', flag: '🇪🇨', sortOrder: 4,   translations: { es: 'Ecuador',           en: 'Ecuador' } },
  { isoCode: 'PE', name: 'Perú',              dialCode: '+51',  flag: '🇵🇪', sortOrder: 5,   translations: { es: 'Perú',              en: 'Peru' } },
  { isoCode: 'AR', name: 'Argentina',         dialCode: '+54',  flag: '🇦🇷', sortOrder: 6,   translations: { es: 'Argentina',         en: 'Argentina' } },
  { isoCode: 'CL', name: 'Chile',             dialCode: '+56',  flag: '🇨🇱', sortOrder: 7,   translations: { es: 'Chile',             en: 'Chile' } },
  { isoCode: 'BR', name: 'Brasil',            dialCode: '+55',  flag: '🇧🇷', sortOrder: 8,   translations: { es: 'Brasil',            en: 'Brazil' } },
  { isoCode: 'ES', name: 'España',            dialCode: '+34',  flag: '🇪🇸', sortOrder: 9,   translations: { es: 'España',            en: 'Spain' } },
  { isoCode: 'US', name: 'Estados Unidos',    dialCode: '+1',   flag: '🇺🇸', sortOrder: 10,  translations: { es: 'Estados Unidos',    en: 'United States' } },
  { isoCode: 'PA', name: 'Panamá',            dialCode: '+507', flag: '🇵🇦', sortOrder: 11,  translations: { es: 'Panamá',            en: 'Panama' } },
  { isoCode: 'CR', name: 'Costa Rica',        dialCode: '+506', flag: '🇨🇷', sortOrder: 12,  translations: { es: 'Costa Rica',        en: 'Costa Rica' } },
  { isoCode: 'GT', name: 'Guatemala',         dialCode: '+502', flag: '🇬🇹', sortOrder: 13,  translations: { es: 'Guatemala',         en: 'Guatemala' } },
  { isoCode: 'DO', name: 'República Dominicana', dialCode: '+1809', flag: '🇩🇴', sortOrder: 14, translations: { es: 'República Dominicana', en: 'Dominican Republic' } },
  { isoCode: 'BO', name: 'Bolivia',           dialCode: '+591', flag: '🇧🇴', sortOrder: 15,  translations: { es: 'Bolivia',           en: 'Bolivia' } },
  { isoCode: 'PY', name: 'Paraguay',          dialCode: '+595', flag: '🇵🇾', sortOrder: 16,  translations: { es: 'Paraguay',          en: 'Paraguay' } },
  { isoCode: 'UY', name: 'Uruguay',           dialCode: '+598', flag: '🇺🇾', sortOrder: 17,  translations: { es: 'Uruguay',           en: 'Uruguay' } },
];

// ─── Departamentos de Colombia (DANE) ────────────────────────────

const DEPARTMENTS = [
  { code: '05', name: 'Antioquia',           translations: { es: 'Antioquia',           en: 'Antioquia' } },
  { code: '08', name: 'Atlántico',           translations: { es: 'Atlántico',           en: 'Atlantico' } },
  { code: '11', name: 'Bogotá D.C.',         translations: { es: 'Bogotá D.C.',         en: 'Bogota D.C.' } },
  { code: '13', name: 'Bolívar',             translations: { es: 'Bolívar',             en: 'Bolivar' } },
  { code: '15', name: 'Boyacá',              translations: { es: 'Boyacá',              en: 'Boyaca' } },
  { code: '17', name: 'Caldas',              translations: { es: 'Caldas',              en: 'Caldas' } },
  { code: '18', name: 'Caquetá',             translations: { es: 'Caquetá',             en: 'Caqueta' } },
  { code: '19', name: 'Cauca',               translations: { es: 'Cauca',               en: 'Cauca' } },
  { code: '20', name: 'Cesar',               translations: { es: 'Cesar',               en: 'Cesar' } },
  { code: '23', name: 'Córdoba',             translations: { es: 'Córdoba',             en: 'Cordoba' } },
  { code: '25', name: 'Cundinamarca',        translations: { es: 'Cundinamarca',        en: 'Cundinamarca' } },
  { code: '27', name: 'Chocó',               translations: { es: 'Chocó',               en: 'Choco' } },
  { code: '41', name: 'Huila',               translations: { es: 'Huila',               en: 'Huila' } },
  { code: '44', name: 'La Guajira',          translations: { es: 'La Guajira',          en: 'La Guajira' } },
  { code: '47', name: 'Magdalena',           translations: { es: 'Magdalena',           en: 'Magdalena' } },
  { code: '50', name: 'Meta',                translations: { es: 'Meta',                en: 'Meta' } },
  { code: '52', name: 'Nariño',              translations: { es: 'Nariño',              en: 'Narino' } },
  { code: '54', name: 'Norte de Santander',  translations: { es: 'Norte de Santander',  en: 'Norte de Santander' } },
  { code: '63', name: 'Quindío',             translations: { es: 'Quindío',             en: 'Quindio' } },
  { code: '66', name: 'Risaralda',           translations: { es: 'Risaralda',           en: 'Risaralda' } },
  { code: '68', name: 'Santander',           translations: { es: 'Santander',           en: 'Santander' } },
  { code: '70', name: 'Sucre',               translations: { es: 'Sucre',               en: 'Sucre' } },
  { code: '73', name: 'Tolima',              translations: { es: 'Tolima',              en: 'Tolima' } },
  { code: '76', name: 'Valle del Cauca',     translations: { es: 'Valle del Cauca',     en: 'Valle del Cauca' } },
  { code: '81', name: 'Arauca',              translations: { es: 'Arauca',              en: 'Arauca' } },
  { code: '85', name: 'Casanare',            translations: { es: 'Casanare',            en: 'Casanare' } },
  { code: '86', name: 'Putumayo',            translations: { es: 'Putumayo',            en: 'Putumayo' } },
  { code: '88', name: 'San Andrés y Providencia', translations: { es: 'San Andrés y Providencia', en: 'San Andres and Providencia' } },
  { code: '91', name: 'Amazonas',            translations: { es: 'Amazonas',            en: 'Amazonas' } },
  { code: '94', name: 'Guainía',             translations: { es: 'Guainía',             en: 'Guainia' } },
  { code: '95', name: 'Guaviare',            translations: { es: 'Guaviare',            en: 'Guaviare' } },
  { code: '97', name: 'Vaupés',              translations: { es: 'Vaupés',              en: 'Vaupes' } },
  { code: '99', name: 'Vichada',             translations: { es: 'Vichada',             en: 'Vichada' } },
];

// ─── Ciudades principales por departamento ───────────────────────
// Formato: [deptCode, cityCode, name_es, name_en]

const CITIES: [string, string, string, string][] = [
  // Antioquia
  ['05', '05001', 'Medellín', 'Medellin'],
  ['05', '05088', 'Bello', 'Bello'],
  ['05', '05380', 'Itagüí', 'Itagui'],
  ['05', '05266', 'Envigado', 'Envigado'],
  ['05', '05308', 'Girardota', 'Girardota'],
  ['05', '05631', 'Sabaneta', 'Sabaneta'],
  ['05', '05045', 'Apartadó', 'Apartado'],
  ['05', '05093', 'Caucasia', 'Caucasia'],
  ['05', '05440', 'La Ceja', 'La Ceja'],
  ['05', '05790', 'Turbo', 'Turbo'],
  // Atlántico
  ['08', '08001', 'Barranquilla', 'Barranquilla'],
  ['08', '08296', 'Galapa', 'Galapa'],
  ['08', '08549', 'Puerto Colombia', 'Puerto Colombia'],
  ['08', '08372', 'Malambo', 'Malambo'],
  ['08', '08573', 'Sabanagrande', 'Sabanagrande'],
  ['08', '08433', 'Soledad', 'Soledad'],
  // Bogotá D.C.
  ['11', '11001', 'Bogotá D.C.', 'Bogota D.C.'],
  // Bolívar
  ['13', '13001', 'Cartagena', 'Cartagena'],
  ['13', '13140', 'Cicuco', 'Cicuco'],
  ['13', '13430', 'Magangué', 'Magangue'],
  ['13', '13490', 'Mompós', 'Mompos'],
  // Boyacá
  ['15', '15001', 'Tunja', 'Tunja'],
  ['15', '15176', 'Chiquinquirá', 'Chiquinquira'],
  ['15', '15759', 'Sogamoso', 'Sogamoso'],
  ['15', '15442', 'Moniquirá', 'Moniquira'],
  // Caldas
  ['17', '17001', 'Manizales', 'Manizales'],
  ['17', '17380', 'La Dorada', 'La Dorada'],
  ['17', '17653', 'Riosucio', 'Riosucio'],
  // Caquetá
  ['18', '18001', 'Florencia', 'Florencia'],
  // Cauca
  ['19', '19001', 'Popayán', 'Popayan'],
  ['19', '19698', 'Santander de Quilichao', 'Santander de Quilichao'],
  // Cesar
  ['20', '20001', 'Valledupar', 'Valledupar'],
  ['20', '20443', 'La Jagua de Ibirico', 'La Jagua de Ibirico'],
  // Córdoba
  ['23', '23001', 'Montería', 'Monteria'],
  ['23', '23672', 'Sahagún', 'Sahagun'],
  ['23', '23417', 'Lorica', 'Lorica'],
  // Cundinamarca
  ['25', '25899', 'Zipaquirá', 'Zipaquira'],
  ['25', '25754', 'Soacha', 'Soacha'],
  ['25', '25207', 'Chía', 'Chia'],
  ['25', '25290', 'Facatativá', 'Facatativa'],
  ['25', '25473', 'Mosquera', 'Mosquera'],
  ['25', '25473', 'Funza', 'Funza'],
  ['25', '25307', 'Girardot', 'Girardot'],
  // Chocó
  ['27', '27001', 'Quibdó', 'Quibdo'],
  // Huila
  ['41', '41001', 'Neiva', 'Neiva'],
  ['41', '41298', 'Garzón', 'Garzon'],
  ['41', '41349', 'La Plata', 'La Plata'],
  // La Guajira
  ['44', '44001', 'Riohacha', 'Riohacha'],
  ['44', '44430', 'Maicao', 'Maicao'],
  // Magdalena
  ['47', '47001', 'Santa Marta', 'Santa Marta'],
  ['47', '47245', 'El Banco', 'El Banco'],
  ['47', '47460', 'Fundación', 'Fundacion'],
  // Meta
  ['50', '50001', 'Villavicencio', 'Villavicencio'],
  ['50', '50006', 'Acacías', 'Acacias'],
  ['50', '50450', 'Puerto López', 'Puerto Lopez'],
  // Nariño
  ['52', '52001', 'Pasto', 'Pasto'],
  ['52', '52356', 'Ipiales', 'Ipiales'],
  ['52', '52254', 'Tumaco', 'Tumaco'],
  // Norte de Santander
  ['54', '54001', 'Cúcuta', 'Cucuta'],
  ['54', '54051', 'Villa del Rosario', 'Villa del Rosario'],
  ['54', '54405', 'Los Patios', 'Los Patios'],
  ['54', '54099', 'Ocaña', 'Ocana'],
  // Quindío
  ['63', '63001', 'Armenia', 'Armenia'],
  ['63', '63401', 'La Tebaida', 'La Tebaida'],
  ['63', '63470', 'Montenegro', 'Montenegro'],
  // Risaralda
  ['66', '66001', 'Pereira', 'Pereira'],
  ['66', '66045', 'Dosquebradas', 'Dosquebradas'],
  ['66', '66682', 'Santa Rosa de Cabal', 'Santa Rosa de Cabal'],
  // Santander
  ['68', '68001', 'Bucaramanga', 'Bucaramanga'],
  ['68', '68081', 'Barrancabermeja', 'Barrancabermeja'],
  ['68', '68276', 'Floridablanca', 'Floridablanca'],
  ['68', '68307', 'Girón', 'Giron'],
  ['68', '68547', 'Piedecuesta', 'Piedecuesta'],
  // Sucre
  ['70', '70001', 'Sincelejo', 'Sincelejo'],
  ['70', '70215', 'Corozal', 'Corozal'],
  // Tolima
  ['73', '73001', 'Ibagué', 'Ibague'],
  ['73', '73043', 'Espinal', 'Espinal'],
  ['73', '73624', 'Honda', 'Honda'],
  // Valle del Cauca
  ['76', '76001', 'Cali', 'Cali'],
  ['76', '76109', 'Buenaventura', 'Buenaventura'],
  ['76', '76111', 'Buga', 'Buga'],
  ['76', '76147', 'Cartago', 'Cartago'],
  ['76', '76248', 'Palmira', 'Palmira'],
  ['76', '76520', 'Palmira', 'Palmira'],
  ['76', '76563', 'Tuluá', 'Tulua'],
  ['76', '76616', 'Yumbo', 'Yumbo'],
  ['76', '76834', 'Yumbo', 'Yumbo'],
  ['76', '76520', 'Puerto Tejada', 'Puerto Tejada'],
  // Arauca
  ['81', '81001', 'Arauca', 'Arauca'],
  // Casanare
  ['85', '85001', 'Yopal', 'Yopal'],
  // Putumayo
  ['86', '86001', 'Mocoa', 'Mocoa'],
  // San Andrés
  ['88', '88001', 'San Andrés', 'San Andres'],
  // Amazonas
  ['91', '91001', 'Leticia', 'Leticia'],
  // Guainía
  ['94', '94001', 'Inírida', 'Inirida'],
  // Guaviare
  ['95', '95001', 'San José del Guaviare', 'San Jose del Guaviare'],
  // Vaupés
  ['97', '97001', 'Mitú', 'Mitu'],
  // Vichada
  ['99', '99001', 'Puerto Carreño', 'Puerto Carreno'],
];

// ─── Categorías maestras ─────────────────────────────────────────

const CATEGORIES = [
  // Servicios + productos compartidos
  { name: 'Uñas',        type: 'service' as const, icon: '💅', color: '#F43F5E', sortOrder: 1,  translations: { es: 'Uñas',        en: 'Nails' } },
  { name: 'Cabello',     type: 'service' as const, icon: '✂️', color: '#8B5CF6', sortOrder: 2,  translations: { es: 'Cabello',     en: 'Hair' } },
  { name: 'Maquillaje',  type: 'service' as const, icon: '💄', color: '#EC4899', sortOrder: 3,  translations: { es: 'Maquillaje',  en: 'Makeup' } },
  { name: 'Piel',        type: 'service' as const, icon: '🧴', color: '#F97316', sortOrder: 4,  translations: { es: 'Piel',        en: 'Skin' } },
  { name: 'Spa',         type: 'service' as const, icon: '🧖', color: '#14B8A6', sortOrder: 5,  translations: { es: 'Spa',         en: 'Spa' } },
  { name: 'Cejas',       type: 'service' as const, icon: '👁️', color: '#6366F1', sortOrder: 6,  translations: { es: 'Cejas',       en: 'Eyebrows' } },
  { name: 'Pestañas',    type: 'service' as const, icon: '👁️', color: '#0EA5E9', sortOrder: 7,  translations: { es: 'Pestañas',    en: 'Lashes' } },
  { name: 'Depilación',  type: 'service' as const, icon: '🪒', color: '#64748B', sortOrder: 8,  translations: { es: 'Depilación',  en: 'Waxing' } },
  { name: 'Masajes',     type: 'service' as const, icon: '🤲', color: '#D97706', sortOrder: 9,  translations: { es: 'Masajes',     en: 'Massages' } },
  { name: 'Bronceado',   type: 'service' as const, icon: '☀️', color: '#F59E0B', sortOrder: 10, translations: { es: 'Bronceado',   en: 'Tanning' } },
  // Solo productos
  { name: 'Esmaltes',    type: 'product' as const, icon: '💅', color: '#F43F5E', sortOrder: 1,  translations: { es: 'Esmaltes',    en: 'Nail Polish' } },
  { name: 'Shampoo',     type: 'product' as const, icon: '🧴', color: '#8B5CF6', sortOrder: 2,  translations: { es: 'Shampoo',     en: 'Shampoo' } },
  { name: 'Tratamientos',type: 'product' as const, icon: '🧪', color: '#10B981', sortOrder: 3,  translations: { es: 'Tratamientos',en: 'Treatments' } },
  { name: 'Accesorios',  type: 'product' as const, icon: '🪮', color: '#6366F1', sortOrder: 4,  translations: { es: 'Accesorios',  en: 'Accessories' } },
  { name: 'Equipos',     type: 'product' as const, icon: '🔧', color: '#78716C', sortOrder: 5,  translations: { es: 'Equipos',     en: 'Equipment' } },
];

// ─── Marcas maestras ─────────────────────────────────────────────

const BRANDS = [
  { name: 'OPI',          translations: { es: 'OPI',          en: 'OPI' } },
  { name: 'Essie',        translations: { es: 'Essie',        en: 'Essie' } },
  { name: 'CND',          translations: { es: 'CND',          en: 'CND' } },
  { name: 'Gelish',       translations: { es: 'Gelish',       en: 'Gelish' } },
  { name: 'Orly',         translations: { es: 'Orly',         en: 'Orly' } },
  { name: "Sally Hansen", translations: { es: 'Sally Hansen', en: 'Sally Hansen' } },
  { name: "L'Oréal",     translations: { es: "L'Oréal",      en: "L'Oreal" } },
  { name: 'Revlon',       translations: { es: 'Revlon',       en: 'Revlon' } },
  { name: 'Wella',        translations: { es: 'Wella',        en: 'Wella' } },
  { name: 'Schwarzkopf',  translations: { es: 'Schwarzkopf',  en: 'Schwarzkopf' } },
  { name: 'Kérastase',    translations: { es: 'Kérastase',    en: 'Kerastase' } },
  { name: 'Redken',       translations: { es: 'Redken',       en: 'Redken' } },
  { name: 'Joico',        translations: { es: 'Joico',        en: 'Joico' } },
  { name: 'Pantene',      translations: { es: 'Pantene',      en: 'Pantene' } },
  { name: 'Maybelline',   translations: { es: 'Maybelline',   en: 'Maybelline' } },
  { name: 'MAC',          translations: { es: 'MAC',          en: 'MAC' } },
  { name: 'Urban Decay',  translations: { es: 'Urban Decay',  en: 'Urban Decay' } },
  { name: 'NYX',          translations: { es: 'NYX',          en: 'NYX' } },
  { name: 'Neutrogena',   translations: { es: 'Neutrogena',   en: 'Neutrogena' } },
  { name: 'Cetaphil',     translations: { es: 'Cetaphil',     en: 'Cetaphil' } },
];

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding master data...');

  // Países
  console.log('  → Countries...');
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: { ...country },
      create: { ...country },
    });
  }

  // Departamentos de Colombia
  console.log('  → Departments (Colombia)...');
  const colombia = await prisma.country.findUnique({ where: { isoCode: 'CO' } });
  if (!colombia) throw new Error('Colombia not found');

  const deptMap: Record<string, string> = {};
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { countryId_code: { countryId: colombia.id, code: dept.code } },
      update: { name: dept.name, translations: dept.translations },
      create: { countryId: colombia.id, ...dept },
    });
    deptMap[dept.code] = created.id;
  }

  // Ciudades
  console.log('  → Cities (Colombia)...');
  const citySet = new Set<string>();
  for (const [deptCode, cityCode, nameEs, nameEn] of CITIES) {
    const key = `${deptCode}-${cityCode}`;
    if (citySet.has(key)) continue;
    citySet.add(key);
    const departmentId = deptMap[deptCode];
    if (!departmentId) continue;
    await prisma.city.upsert({
      where: { departmentId_code: { departmentId, code: cityCode } },
      update: { name: nameEs, translations: { es: nameEs, en: nameEn } },
      create: { departmentId, code: cityCode, name: nameEs, translations: { es: nameEs, en: nameEn } },
    });
  }

  // Categorías
  console.log('  → Master categories...');
  for (const cat of CATEGORIES) {
    const existing = await prisma.masterCategory.findFirst({
      where: { name: cat.name, type: cat.type },
    });
    if (!existing) {
      await prisma.masterCategory.create({ data: cat });
    }
  }

  // Marcas
  console.log('  → Master brands...');
  for (const brand of BRANDS) {
    const existing = await prisma.masterBrand.findFirst({ where: { name: brand.name } });
    if (!existing) {
      await prisma.masterBrand.create({ data: brand });
    }
  }

  console.log('✅ Master data seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
