import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_AGENTS, DEFAULT_EXPENSE_CATEGORIES } from '../src/common/constants/default-agents';

const prisma = new PrismaClient();

// ─── Global master data ────────────────────────────────────────────

const MASTER_CATEGORIES = [
  { name: 'Uñas',                    type: 'product', icon: 'Palette',    color: '#F43F5E', sortOrder: 1 },
  { name: 'Cabello',                 type: 'product', icon: 'Sparkles',   color: '#8B5CF6', sortOrder: 2 },
  { name: 'Maquillaje',              type: 'product', icon: 'Star',       color: '#EC4899', sortOrder: 3 },
  { name: 'Cuidado de la piel',      type: 'product', icon: 'Heart',      color: '#F97316', sortOrder: 4 },
  { name: 'Accesorios',              type: 'product', icon: 'Package',    color: '#14B8A6', sortOrder: 5 },
  { name: 'Herramientas profesionales', type: 'product', icon: 'Wrench', color: '#6366F1', sortOrder: 6 },
  { name: 'Spa & Relajación',        type: 'service', icon: 'Leaf',       color: '#22C55E', sortOrder: 7 },
  { name: 'Pestañas & Cejas',        type: 'service', icon: 'Eye',        color: '#0EA5E9', sortOrder: 8 },
  { name: 'Depilación',              type: 'service', icon: 'Scissors',   color: '#EAB308', sortOrder: 9 },
  { name: 'Colorimetría',            type: 'service', icon: 'Droplets',   color: '#A855F7', sortOrder: 10 },
] as const;

const MASTER_BRANDS = [
  'L\'Oréal Professionnel', 'OPI', 'Essie', 'Sally Hansen', 'MAC Cosmetics',
  'The Ordinary', 'Revlon', 'NYX Professional Makeup', 'Maybelline',
  'ORLY', 'CND Shellac', 'Gelish', 'Masglo', 'Vogue Cosmetics',
  'Yanbal', 'Unique', 'Cyzone', 'Milani', 'e.l.f. Cosmetics', 'Sinful Colors',
];

// ─── Colombia locations ────────────────────────────────────────────

// Cities stored as { name, code } — code = slug of name
function cityEntry(name: string) {
  return { name, code: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20) };
}

const COLOMBIA_DEPARTMENTS = [
  { name: 'Bogotá D.C.',      code: 'DC',  cities: ['Bogotá'] },
  { name: 'Antioquia',        code: 'ANT', cities: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro'] },
  { name: 'Valle del Cauca',  code: 'VAC', cities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago'] },
  { name: 'Atlántico',        code: 'ATL', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga'] },
  { name: 'Santander',        code: 'SAN', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'] },
  { name: 'Cundinamarca',     code: 'CUN', cities: ['Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Mosquera'] },
  { name: 'Bolívar',          code: 'BOL', cities: ['Cartagena', 'Magangué', 'El Carmen de Bolívar'] },
  { name: 'Nariño',           code: 'NAR', cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'] },
  { name: 'Boyacá',           code: 'BOY', cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'] },
  { name: 'Risaralda',        code: 'RIS', cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'] },
  { name: 'Córdoba',          code: 'COR', cities: ['Montería', 'Lorica', 'Cereté', 'Sahagún'] },
  { name: 'Magdalena',        code: 'MAG', cities: ['Santa Marta', 'Ciénaga', 'Fundación'] },
  { name: 'Tolima',           code: 'TOL', cities: ['Ibagué', 'Espinal', 'Melgar', 'Honda'] },
  { name: 'Caldas',           code: 'CAL', cities: ['Manizales', 'Villamaría', 'La Dorada', 'Chinchiná'] },
  { name: 'Huila',            code: 'HUI', cities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata'] },
];

// ─── Seed helpers ─────────────────────────────────────────────────

async function seedMasterData() {
  console.log('\n📦 Seeding global master data...');

  // Colombia
  const existing = await prisma.country.findFirst({ where: { isoCode: 'CO' } });
  if (!existing) {
    const colombia = await prisma.country.create({
      data: { name: 'Colombia', isoCode: 'CO', dialCode: '+57', flag: '🇨🇴', isActive: true, sortOrder: 1 },
    });

    for (const dep of COLOMBIA_DEPARTMENTS) {
      const dept = await prisma.department.create({
        data: { countryId: colombia.id, name: dep.name, code: dep.code },
      });
      await prisma.city.createMany({
        data: dep.cities.map(city => ({ departmentId: dept.id, ...cityEntry(city), name: city })),
        skipDuplicates: true,
      });
    }
    console.log('  ✅ Colombia seeded (15 departamentos, ciudades principales)');
  } else {
    console.log('  ⏭️  Colombia ya existe, omitiendo');
  }

  // Master categories
  const existingCats = await prisma.masterCategory.count();
  if (existingCats === 0) {
    await prisma.masterCategory.createMany({
      data: MASTER_CATEGORIES.map(c => ({
        name: c.name,
        type: c.type as any,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sortOrder,
        isActive: true,
        translations: { en: c.name },
      })),
      skipDuplicates: true,
    });
    console.log(`  ✅ ${MASTER_CATEGORIES.length} categorías globales creadas`);
  } else {
    console.log(`  ⏭️  Categorías globales ya existen (${existingCats})`);
  }

  // Master brands
  const existingBrands = await prisma.masterBrand.count();
  if (existingBrands === 0) {
    await prisma.masterBrand.createMany({
      data: MASTER_BRANDS.map(name => ({
        name,
        isActive: true,
        translations: { en: name },
      })),
      skipDuplicates: true,
    });
    console.log(`  ✅ ${MASTER_BRANDS.length} marcas globales creadas`);
  } else {
    console.log(`  ⏭️  Marcas globales ya existen (${existingBrands})`);
  }
}

async function seedPlans() {
  console.log('\n📋 Seeding plans...');

  const existing = await prisma.plan.count();
  if (existing > 0) {
    console.log('  ⏭️  Plans ya existen, omitiendo');
    return prisma.plan.findFirst({ where: { slug: 'free' } });
  }

  const freePlan = await prisma.plan.create({
    data: {
      name: 'Gratuito', slug: 'free',
      description: 'Prueba de 14 días con funcionalidades básicas',
      monthlyPrice: 0, yearlyPrice: 0,
      maxUsers: 2, maxBranches: 1,
      features: {
        modules: { pos: true, inventory: true, catalog: false, appointments: false, reports: false, ai_agents: false, suppliers: false, expenses: false, accounting: false },
        limits: { maxBranches: 1, maxUsers: 2, aiTokensMonthly: 5000, storageGB: 1 },
      },
      isPopular: false, sortOrder: 0,
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Profesional', slug: 'professional',
      description: 'Para salones que necesitan gestión completa',
      monthlyPrice: 149900, yearlyPrice: 1499000,
      maxUsers: 10, maxBranches: 3,
      features: {
        modules: { pos: true, inventory: true, catalog: true, appointments: true, reports: true, ai_agents: true, suppliers: true, expenses: true, purchases: true, customers: true, users: true, settings: true, accounting: false },
        limits: { maxBranches: 3, maxUsers: 10, aiTokensMonthly: 50000, storageGB: 5 },
      },
      isPopular: true, sortOrder: 1,
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Empresarial', slug: 'enterprise',
      description: 'Para cadenas multi-sucursal con soporte dedicado',
      monthlyPrice: 449900, yearlyPrice: 4499000,
      maxUsers: 50, maxBranches: 20,
      features: {
        modules: { pos: true, inventory: true, catalog: true, appointments: true, reports: true, ai_agents: true, suppliers: true, expenses: true, accounting: true, api: true, whitelabel: true },
        limits: { maxBranches: 20, maxUsers: 50, aiTokensMonthly: 200000, storageGB: 50 },
      },
      isPopular: false, sortOrder: 2,
    },
  });

  console.log('  ✅ Plans: Gratuito, Profesional, Empresarial');
  return freePlan;
}

async function seedSuperAdmin() {
  console.log('\n👑 Seeding superadmin...');

  const existing = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  if (existing) {
    console.log('  ⏭️  Superadmin ya existe:', existing.email);
    return;
  }

  // Platform tenant (needed for superadmin FK)
  const platformTenant = await prisma.tenant.create({
    data: { name: 'Glamorapp Platform', slug: 'platform', plan: 'enterprise' },
  });

  const passwordHash = await bcrypt.hash('superadmin123', 10);
  await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      email: 'superadmin@glamorapp.com',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'superadmin',
    },
  });

  // Platform config (commission)
  await prisma.platformConfig.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', commissionRate: 0.03, minPayoutAmount: 50000 },
    update: {},
  });

  console.log('  ✅ superadmin@glamorapp.com / superadmin123');
}

async function seedDemoTenant(freePlanId: string) {
  console.log('\n🏪 Seeding demo tenant...');

  const existing = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
  if (existing) {
    console.log('  ⏭️  Demo tenant ya existe, omitiendo');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: { name: 'Salón Demo', slug: 'demo', plan: 'professional' },
  });

  const store = await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Glamorapp Beauty Studio',
      slug: 'demo-principal',
      email: 'admin@demo.glamorapp.co',
      phone: '+57 300 000 0001',
      address: 'Calle 80 # 45-12',
      city: 'Bogotá',
      country: 'Colombia',
      currency: 'COP',
      timezone: 'America/Bogota',
      locale: 'es',
      primaryColor: '#EF2D8F',
    },
  });

  // Subscription on professional plan
  const proPlan = await prisma.plan.findFirst({ where: { slug: 'professional' } });
  if (proPlan) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id, planId: proPlan.id,
        status: 'active', billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // Users
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: { tenantId: tenant.id, storeId: store.id, email: 'admin@demo.glamorapp.co', passwordHash: hash, firstName: 'María', lastName: 'García', role: 'tenant_admin' },
  });

  const storeAdminHash = await bcrypt.hash('store123', 10);
  const storeAdmin = await prisma.user.create({
    data: { tenantId: tenant.id, storeId: store.id, email: 'store@demo.glamorapp.co', passwordHash: storeAdminHash, firstName: 'Carlos', lastName: 'Mendoza', role: 'store_admin' },
  });

  const proHash = await bcrypt.hash('pro123', 10);
  const pro1 = await prisma.user.create({
    data: { tenantId: tenant.id, storeId: store.id, email: 'ana@demo.glamorapp.co', passwordHash: proHash, firstName: 'Ana', lastName: 'López', role: 'professional' },
  });

  const cashierHash = await bcrypt.hash('caja123', 10);
  await prisma.user.create({
    data: { tenantId: tenant.id, storeId: store.id, email: 'cajero@demo.glamorapp.co', passwordHash: cashierHash, firstName: 'Carlos', lastName: 'Ruiz', role: 'cashier' },
  });

  // Permissions
  const allModules = ['stores', 'users', 'roles', 'dashboard', 'reports', 'ai_agents', 'billing', 'settings', 'pos', 'inventory', 'catalog', 'appointments', 'customers', 'suppliers', 'purchases', 'expenses', 'whatsapp', 'audit'];
  for (const mod of allModules) {
    await prisma.permission.create({ data: { tenantId: tenant.id, userId: admin.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true } });
    await prisma.permission.create({ data: { tenantId: tenant.id, userId: storeAdmin.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: mod !== 'users', canExport: true } });
  }

  // ── Auto-seed from master data (same as register() flow) ──

  // Product categories from MasterCategories
  const masterCats = await prisma.masterCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  if (masterCats.length > 0) {
    await prisma.productCategory.createMany({
      data: masterCats.map(mc => ({ tenantId: tenant.id, storeId: store.id, name: mc.name, color: (mc as any).color ?? '#EF2D8F', icon: mc.icon ?? 'Package' })),
      skipDuplicates: true,
    });
  }

  // Brands from MasterBrands
  const masterBrands = await prisma.masterBrand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  if (masterBrands.length > 0) {
    await prisma.brand.createMany({
      data: masterBrands.map(mb => ({ tenantId: tenant.id, storeId: store.id, name: mb.name, logoUrl: mb.logoUrl ?? null })),
      skipDuplicates: true,
    });
  }

  // Expense categories
  await prisma.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map(name => ({ tenantId: tenant.id, storeId: store.id, name })),
    skipDuplicates: true,
  });

  // AI Agents
  await prisma.aiAgent.createMany({
    data: DEFAULT_AGENTS.map(agent => ({
      tenantId: tenant.id, storeId: store.id,
      slug: agent.slug, name: agent.name, description: agent.description,
      icon: agent.icon, category: agent.category,
      autonomyLevel: agent.autonomyLevel as any,
      aiProvider: agent.aiProvider, schedule: agent.schedule,
      isActive: true, status: 'active' as any,
    })),
    skipDuplicates: true,
  });

  // Get category references for products
  const nailsCat = masterCats.find(c => c.name === 'Uñas');
  const hairCat   = masterCats.find(c => c.name === 'Cabello');
  const makeupCat = masterCats.find(c => c.name === 'Maquillaje');
  const skinCat   = masterCats.find(c => c.name === 'Cuidado de la piel');
  const toolsCat  = masterCats.find(c => c.name === 'Herramientas profesionales');

  const pCats = await prisma.productCategory.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true } });
  const catId = (name: string) => pCats.find(c => c.name === name)?.id;

  const opi    = (await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: 'OPI' } }))?.id;
  const loreal = (await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: "L'Oréal Professionnel" } }))?.id;
  const mac    = (await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: 'MAC Cosmetics' } }))?.id;
  const ordinary = (await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: 'The Ordinary' } }))?.id;

  // Products
  const products = await Promise.all([
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Uñas'), brandId: opi, name: 'Esmalte Gel Bubble Bath', sku: 'EG-001', salePrice: 28000, costPrice: 14000, currentStock: 50, minStock: 10 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Uñas'), brandId: opi, name: 'Esmalte Gel Big Apple Red', sku: 'EG-002', salePrice: 28000, costPrice: 14000, currentStock: 40, minStock: 10 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Cabello'), brandId: loreal, name: 'Shampoo Profesional Reparación', sku: 'SH-001', salePrice: 85000, costPrice: 42000, currentStock: 25, minStock: 5 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Cabello'), brandId: loreal, name: 'Acondicionador Hidratante', sku: 'AC-001', salePrice: 75000, costPrice: 38000, currentStock: 20, minStock: 5 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Maquillaje'), brandId: mac, name: 'Labial Matte Ruby Woo', sku: 'LB-001', salePrice: 115000, costPrice: 58000, currentStock: 15, minStock: 3 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Cuidado de la piel'), brandId: ordinary, name: 'Sérum Niacinamida 10%', sku: 'SN-001', salePrice: 95000, costPrice: 48000, currentStock: 0, minStock: 3, isFeatured: true } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: catId('Herramientas profesionales'), name: 'Cepillo Térmico Profesional 40mm', sku: 'CT-001', salePrice: 135000, costPrice: 68000, currentStock: 8, minStock: 2 } }),
  ]);

  // Services
  const services = await Promise.all([
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Manicure Clásico', category: 'manicure', price: 35000, durationMinutes: 60, color: '#EC4899' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Pedicure Spa', category: 'pedicure', price: 45000, durationMinutes: 75, color: '#F97316' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Uñas en Gel', category: 'nails', price: 65000, durationMinutes: 75, color: '#8B5CF6' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Uñas Acrílicas', category: 'nails', price: 75000, durationMinutes: 90, color: '#8B5CF6' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Diseño de Uñas', category: 'nails', price: 55000, durationMinutes: 60, color: '#F43F5E' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Coloración', category: 'hair', price: 180000, durationMinutes: 120, color: '#22C55E' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Corte y Peinado', category: 'hair', price: 65000, durationMinutes: 60, color: '#22C55E' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Lifting de Pestañas', category: 'lashes', price: 90000, durationMinutes: 60, color: '#0EA5E9' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Maquillaje Social', category: 'makeup', price: 110000, durationMinutes: 60, color: '#EAB308' } }),
  ]);

  // Customers
  const customers = await Promise.all([
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C001', firstName: 'Sofía', lastName: 'Hernández', phone: '+57 300 111 0001', email: 'sofia@email.com', segment: 'vip', loyaltyTier: 'gold', loyaltyPoints: 2500, totalPurchases: 24, totalSpent: 1850000, dateOfBirth: new Date('1990-03-15') } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C002', firstName: 'Valentina', lastName: 'Martínez', phone: '+57 300 111 0002', email: 'val@email.com', segment: 'frequent', loyaltyTier: 'silver', loyaltyPoints: 1200, totalPurchases: 12, totalSpent: 820000, dateOfBirth: new Date('1995-07-22') } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C003', firstName: 'Regina', lastName: 'López', phone: '+57 300 111 0003', segment: 'new', totalPurchases: 1, totalSpent: 35000 } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C004', firstName: 'Fernanda', lastName: 'Gómez', phone: '+57 300 111 0004', email: 'fer@email.com', segment: 'frequent', loyaltyTier: 'bronze', loyaltyPoints: 500, totalPurchases: 8, totalSpent: 480000, lastPurchaseAt: new Date(Date.now() - 45 * 86400000) } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C005', firstName: 'Camila', lastName: 'Díaz', phone: '+57 300 111 0005', segment: 'vip', loyaltyTier: 'platinum', loyaltyPoints: 5000, totalPurchases: 36, totalSpent: 3200000, dateOfBirth: new Date('1988-11-08') } }),
  ]);

  // Nail designs
  await prisma.nailDesign.createMany({
    data: [
      { tenantId: tenant.id, storeId: store.id, name: 'French Classic', category: 'classic', technique: 'gel', colors: ['#FFB6C1', '#FFFFFF'] as any, suggestedPrice: 45000, estimatedDurationMinutes: 45, popularityScore: 150 },
      { tenantId: tenant.id, storeId: store.id, name: 'Glitter Ombré', category: 'decorated', technique: 'acrylic', colors: ['#FF69B4', '#FFD700'] as any, suggestedPrice: 65000, estimatedDurationMinutes: 60, popularityScore: 120 },
      { tenantId: tenant.id, storeId: store.id, name: 'Marble Art', category: 'artistic', technique: 'gel', colors: ['#FFFFFF', '#808080'] as any, suggestedPrice: 75000, estimatedDurationMinutes: 75, popularityScore: 90, isFavorite: true },
      { tenantId: tenant.id, storeId: store.id, name: 'Neon Summer', category: 'trending', technique: 'gel', colors: ['#00FF00', '#FF00FF'] as any, suggestedPrice: 60000, estimatedDurationMinutes: 60, popularityScore: 200, isFavorite: true },
    ],
  });

  // Sample appointments
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  await Promise.all([
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[0].id, professionalId: pro1.id, serviceId: services[0].id, date: today, startTime: '10:00', endTime: '11:00', status: 'confirmed', price: 35000 } }),
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[1].id, professionalId: pro1.id, serviceId: services[2].id, date: today, startTime: '11:00', endTime: '12:15', status: 'confirmed', price: 65000 } }),
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[2].id, professionalId: pro1.id, serviceId: services[4].id, date: tomorrow, startTime: '09:00', endTime: '10:00', status: 'pending', price: 55000 } }),
  ]);

  console.log('  ✅ Demo tenant creado');
  console.log('  📧 admin@demo.glamorapp.co / admin123');
  console.log('  📧 store@demo.glamorapp.co / store123');
  console.log('  📧 cajero@demo.glamorapp.co / caja123');
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de Glamorapp...');

  // ONLY truncate if explicitly requested (pass --reset flag)
  const reset = process.argv.includes('--reset');
  if (reset) {
    console.log('⚠️  --reset: limpiando todas las tablas...');
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE r RECORD; BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('  ✅ Tablas limpiadas');
  }

  const freePlan = await seedPlans();
  await seedSuperAdmin();
  await seedMasterData();
  if (freePlan) {
    await seedDemoTenant(freePlan.id);
  }

  console.log('\n🎉 Seed completado!');
  console.log('👑 superadmin@glamorapp.com / superadmin123');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
