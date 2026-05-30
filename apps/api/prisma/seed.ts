import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (respect FK constraints)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aiRecommendation.deleteMany();
  await prisma.aiAgentAction.deleteMany();
  await prisma.aiAgentPermission.deleteMany();
  await prisma.aiUsage.deleteMany();
  await prisma.aiAgent.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.package.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplierProductPrice.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplierDocument.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.paymentException.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.nailDesign.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashRegisterSession.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.tenant.deleteMany();

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Glamorapp Demo',
      slug: 'demo',
      plan: 'professional',
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // ─── PLANS ──────────────────────────────────────────────────
  const freePlan = await prisma.plan.create({
    data: {
      name: 'Gratuito', slug: 'free', description: 'Plan de prueba de 14 días con funcionalidades básicas',
      monthlyPrice: 0, yearlyPrice: 0,
      maxUsers: 2, maxBranches: 1,
      features: {
        modules: { pos: true, inventory: true, catalog: false, appointments: false, reports: false, ai_agents: false, suppliers: false, expenses: false, accounting: false },
        limits: { maxBranches: 1, maxUsers: 2, aiTokensMonthly: 5000, storageGB: 1 },
      },
      isPopular: false, sortOrder: 0,
    },
  });
  const proPlan = await prisma.plan.create({
    data: {
      name: 'Profesional', slug: 'professional', description: 'Para salones que necesitan gestión completa',
      monthlyPrice: 499, yearlyPrice: 4990,
      maxUsers: 10, maxBranches: 3,
      features: {
        modules: { pos: true, inventory: true, catalog: true, appointments: true, reports: true, ai_agents: true, suppliers: true, expenses: true, purchases: true, customers: true, users: true, settings: true, accounting: false },
        limits: { maxBranches: 3, maxUsers: 10, aiTokensMonthly: 50000, storageGB: 5 },
      },
      isPopular: true, sortOrder: 1,
    },
  });
  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Empresarial', slug: 'enterprise', description: 'Para cadenas multi-sucursal con soporte dedicado',
      monthlyPrice: 1499, yearlyPrice: 14990,
      maxUsers: 50, maxBranches: 20,
      features: {
        modules: { pos: true, inventory: true, catalog: true, appointments: true, reports: true, ai_agents: true, suppliers: true, expenses: true, accounting: true, api: true, whiteLabel: true },
        limits: { maxBranches: 20, maxUsers: 50, aiTokensMonthly: 200000, storageGB: 50 },
      },
      isPopular: false, sortOrder: 2,
    },
  });
  console.log('✅ Plans created: Free, Profesional, Empresarial');

  // ─── Demo subscription ──────────────────────────────────────
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  });
  console.log('✅ Demo subscription: Profesional / monthly');

  // ─── PLATFORM ADMIN ─────────────────────────────────────────
  const platformTenant = await prisma.tenant.create({
    data: { name: 'Glamorapp Platform', slug: 'platform', plan: 'enterprise' },
  });
  const platformStore = await prisma.store.create({
    data: {
      tenantId: platformTenant.id,
      name: 'Platform Admin',
      slug: 'platform',
    },
  });
  const superAdminPass = await bcrypt.hash('superadmin123', 10);
  await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      email: 'superadmin@glamorapp.com',
      passwordHash: superAdminPass,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'superadmin',
    },
  });
  console.log('✅ Platform admin: superadmin@glamorapp.com / superadmin123');

  // Create store
  const store = await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Glamorapp Beauty Studio',
      slug: 'demo',
      email: 'admin@glamorapp.com',
      phone: '+52 555 123 4567',
      address: 'Av. Reforma 222, Col. Juárez',
      city: 'Ciudad de México',
      country: 'México',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      locale: 'es',
      primaryColor: '#EF2D8F',
    },
  });
  console.log('✅ Store created:', store.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      storeId: store.id,
      email: 'admin@glamorapp.com',
      passwordHash,
      firstName: 'María',
      lastName: 'García',
      phone: '+52 555 000 0001',
      role: 'tenant_admin',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create store_admin
  const storeAdminPass = await bcrypt.hash('store123', 10);
  const storeAdmin = await prisma.user.create({
    data: {
      tenantId: tenant.id, storeId: store.id,
      email: 'store@glamorapp.com', passwordHash: storeAdminPass,
      firstName: 'Carlos', lastName: 'Mendoza', role: 'store_admin',
    },
  });

  // Permissions for store_admin — all operational modules
  const storeAdminModules = ['dashboard', 'pos', 'inventory', 'catalog', 'appointments', 'customers', 'reports', 'ai_agents', 'suppliers', 'expenses', 'purchases', 'whatsapp', 'settings', 'users', 'stores'];
  for (const mod of storeAdminModules) {
    await prisma.permission.create({
      data: { tenantId: tenant.id, userId: storeAdmin.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    });
  }

  // Create professionals
  const pro1 = await prisma.user.create({
    data: {
      tenantId: tenant.id, storeId: store.id,
      email: 'ana@glamorapp.com', passwordHash,
      firstName: 'Ana', lastName: 'López', role: 'professional',
    },
  });

  // Create cashier
  await prisma.user.create({
    data: {
      tenantId: tenant.id, storeId: store.id,
      email: 'cajero@glamorapp.com', passwordHash,
      firstName: 'Carlos', lastName: 'Ruiz', role: 'cashier',
    },
  });

  // ─── Default Permissions (scopes) per role ──────────────────
  // tenant_admin gets ALL modules with full access
  const adminModules = ['stores', 'users', 'roles', 'dashboard', 'reports', 'ai_agents', 'billing', 'settings', 'pos', 'inventory', 'catalog', 'appointments', 'customers', 'suppliers', 'purchases', 'expenses', 'whatsapp', 'audit'];
  for (const mod of adminModules) {
    await prisma.permission.create({
      data: { tenantId: tenant.id, userId: admin.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    });
  }

  // professional gets only appointments + customers
  const proModules = ['dashboard', 'appointments', 'customers', 'catalog'];
  for (const mod of proModules) {
    await prisma.permission.create({
      data: { tenantId: tenant.id, userId: pro1.id, module: mod, canView: true, canCreate: mod !== 'dashboard', canEdit: mod !== 'dashboard', canDelete: false, canExport: false },
    });
  }
  console.log('✅ Default permissions seeded');

  // ─── Product Categories ───────────────────────────────────
  const categories = await Promise.all([
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Cuidado del cabello', icon: 'Scissors', color: '#8B5CF6' } }),
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Maquillaje', icon: 'Palette', color: '#EC4899' } }),
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Uñas', icon: 'Hand', color: '#F43F5E' } }),
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Cuidado de la piel', icon: 'Sparkles', color: '#F97316' } }),
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Accesorios', icon: 'Gem', color: '#14B8A6' } }),
    prisma.productCategory.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Herramientas', icon: 'Wrench', color: '#6366F1' } }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // ─── Brands ────────────────────────────────────────────────
  const brands = await Promise.all([
    prisma.brand.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'L\'Oréal Professionnel' } }),
    prisma.brand.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'MAC Cosmetics' } }),
    prisma.brand.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'OPI' } }),
    prisma.brand.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'The Ordinary' } }),
  ]);
  console.log('✅ Brands created:', brands.length);

  // ─── Products ──────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[0].id, brandId: brands[0].id, name: 'Shampoo Profesional Reparación', sku: 'SH-001', salePrice: 280, costPrice: 140, currentStock: 25, minStock: 5 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[0].id, brandId: brands[0].id, name: 'Acondicionador Hidratante', sku: 'AC-001', salePrice: 260, costPrice: 130, currentStock: 20, minStock: 5 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[1].id, brandId: brands[1].id, name: 'Labial Matte Ruby Woo', sku: 'LB-001', salePrice: 380, costPrice: 190, currentStock: 15, minStock: 3 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[1].id, brandId: brands[1].id, name: 'Base Líquida Studio Fix', sku: 'BL-001', salePrice: 520, costPrice: 260, currentStock: 10, minStock: 3 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[2].id, brandId: brands[2].id, name: 'Esmalte Gel Bubble Bath', sku: 'EG-001', salePrice: 180, costPrice: 90, currentStock: 50, minStock: 10 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[2].id, brandId: brands[2].id, name: 'Esmalte Gel Big Apple Red', sku: 'EG-002', salePrice: 180, costPrice: 90, currentStock: 40, minStock: 10 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[3].id, brandId: brands[3].id, name: 'Sérum Niacinamida 10%', sku: 'SN-001', salePrice: 320, costPrice: 160, currentStock: 0, minStock: 3, isFeatured: true } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[3].id, brandId: brands[3].id, name: 'Ácido Hialurónico 2%', sku: 'AH-001', salePrice: 290, costPrice: 145, currentStock: 2, minStock: 5, isFeatured: true } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[4].id, name: 'Cepillo Térmico Profesional', sku: 'CT-001', salePrice: 450, costPrice: 225, currentStock: 8, minStock: 3 } }),
    prisma.product.create({ data: { tenantId: tenant.id, storeId: store.id, categoryId: categories[5].id, name: 'Kit de Pinzas Profesionales', sku: 'KP-001', salePrice: 350, costPrice: 175, currentStock: 12, minStock: 5 } }),
  ]);
  console.log('✅ Products created:', products.length);

  // ─── Services ──────────────────────────────────────────────
  const services = await Promise.all([
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Manicure Clásico', category: 'manicure', price: 350, durationMinutes: 60, color: '#EC4899' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Pedicure Spa', category: 'pedicure', price: 400, durationMinutes: 75, color: '#F97316' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Uñas Acrílicas', category: 'nails', price: 600, durationMinutes: 90, color: '#8B5CF6' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Uñas en Gel', category: 'nails', price: 500, durationMinutes: 75, color: '#8B5CF6' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Diseño de Uñas', category: 'nails', price: 450, durationMinutes: 60, color: '#8B5CF6' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Coloración', category: 'hair', price: 1200, durationMinutes: 120, color: '#22C55E' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Corte y Peinado', category: 'hair', price: 450, durationMinutes: 60, color: '#22C55E' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Lifting de Pestañas', category: 'lashes', price: 600, durationMinutes: 60, color: '#F97316' } }),
    prisma.service.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Maquillaje Social', category: 'makeup', price: 700, durationMinutes: 60, color: '#EAB308' } }),
  ]);
  console.log('✅ Services created:', services.length);

  // ─── Customers ─────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C001', firstName: 'Sofía', lastName: 'Hernández', phone: '+52 555 111 0001', email: 'sofia@email.com', segment: 'vip', loyaltyTier: 'gold', loyaltyPoints: 2500, totalPurchases: 24, totalSpent: 15600, dateOfBirth: new Date('1990-03-15') } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C002', firstName: 'Valentina', lastName: 'Martínez', phone: '+52 555 111 0002', email: 'val@email.com', segment: 'frequent', loyaltyTier: 'silver', loyaltyPoints: 1200, totalPurchases: 12, totalSpent: 7200, dateOfBirth: new Date('1995-07-22') } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C003', firstName: 'Regina', lastName: 'López', phone: '+52 555 111 0003', segment: 'new', totalPurchases: 1, totalSpent: 350 } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C004', firstName: 'Fernanda', lastName: 'Gómez', phone: '+52 555 111 0004', email: 'fer@email.com', segment: 'frequent', loyaltyTier: 'bronze', loyaltyPoints: 500, totalPurchases: 8, totalSpent: 4800, lastPurchaseAt: new Date(Date.now() - 45 * 86400000) } }),
    prisma.customer.create({ data: { tenantId: tenant.id, storeId: store.id, customerNumber: 'C005', firstName: 'Camila', lastName: 'Díaz', phone: '+52 555 111 0005', segment: 'vip', loyaltyTier: 'platinum', loyaltyPoints: 5000, totalPurchases: 36, totalSpent: 28000, dateOfBirth: new Date('1988-11-08') } }),
  ]);
  console.log('✅ Customers created:', customers.length);

  // ─── Nail Designs ──────────────────────────────────────────
  await Promise.all([
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'French Classic', category: 'classic', technique: 'gel', colors: ['#FFB6C1', '#FFFFFF'], suggestedPrice: 300, estimatedDurationMinutes: 45, popularityScore: 150 } }),
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Glitter Ombré', category: 'decorated', technique: 'acrylic', colors: ['#FF69B4', '#FFD700'], suggestedPrice: 450, estimatedDurationMinutes: 60, popularityScore: 120 } }),
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Marble Art', category: 'artistic', technique: 'gel', colors: ['#FFFFFF', '#808080'], suggestedPrice: 500, estimatedDurationMinutes: 75, popularityScore: 90, isFavorite: true } }),
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Neon Summer', category: 'trending', technique: 'gel', colors: ['#00FF00', '#FF00FF'], suggestedPrice: 400, estimatedDurationMinutes: 60, popularityScore: 200, isFavorite: true } }),
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Minimalist Dots', category: 'minimalist', technique: 'natural', colors: ['#000000', '#FFFFFF'], suggestedPrice: 250, estimatedDurationMinutes: 30, popularityScore: 80 } }),
    prisma.nailDesign.create({ data: { tenantId: tenant.id, storeId: store.id, name: 'Christmas Sparkle', category: 'seasonal', technique: 'gel', colors: ['#FF0000', '#00FF00', '#FFD700'], suggestedPrice: 550, estimatedDurationMinutes: 90, popularityScore: 60 } }),
  ]);
  console.log('✅ Nail designs created: 6');

  // ─── Expense Categories ────────────────────────────────────
  const expenseCategories = await Promise.all([
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Alquiler', icon: 'Home', color: '#EF4444' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Sueldos', icon: 'Users', color: '#3B82F6' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Productos/Insumos', icon: 'Package', color: '#22C55E' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Servicios', icon: 'Zap', color: '#F97316' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Marketing', icon: 'Megaphone', color: '#EC4899' } }),
  ]);
  console.log('✅ Expense categories created:', expenseCategories.length);

  // ─── AI Agents ─────────────────────────────────────────────
  const agentDefs = [
    { name: 'Agente de Ventas', slug: 'sales', icon: 'TrendingUp', description: 'Analiza tendencias de ventas y sugiere promociones', objective: 'Maximizar ingresos identificando oportunidades de venta cruzada y productos estrella' },
    { name: 'Agente de Inventario', slug: 'inventory', icon: 'Package', description: 'Monitorea niveles de stock y sugiere reórdenes', objective: 'Mantener niveles óptimos de inventario, evitando quiebres de stock' },
    { name: 'Agente de Clientes', slug: 'customers', icon: 'Users', description: 'Segmenta clientes y recomienda acciones de fidelización', objective: 'Aumentar retención y valor de por vida del cliente' },
    { name: 'Agente de Citas', slug: 'appointments', icon: 'Calendar', description: 'Optimiza la agenda y reduce no-shows', objective: 'Maximizar ocupación y minimizar cancelaciones' },
    { name: 'Agente de Marketing', slug: 'marketing', icon: 'Megaphone', description: 'Genera ideas de campañas y promociones', objective: 'Crear campañas efectivas basadas en datos de clientes' },
    { name: 'Agente Financiero', slug: 'financial', icon: 'DollarSign', description: 'Analiza rentabilidad y sugiere ahorros', objective: 'Mejorar márgenes y reducir gastos innecesarios' },
    { name: 'Agente de Proveedores', slug: 'suppliers', icon: 'Truck', description: 'Monitorea pagos pendientes y recomienda proveedores', objective: 'Optimizar cadena de suministro y negociar mejores términos' },
    { name: 'Agente de Catálogo', slug: 'catalog', icon: 'BookOpen', description: 'Optimiza el catálogo de productos y diseños', objective: 'Destacar productos rentables y mejorar la experiencia de navegación' },
  ];

  for (const def of agentDefs) {
    await prisma.aiAgent.create({
      data: {
        tenantId: tenant.id, storeId: store.id,
        name: def.name, slug: def.slug, icon: def.icon,
        description: def.description, objective: def.objective,
        status: 'active',
        analysisFrequency: 'daily',
      },
    });
  }
  console.log('✅ AI Agents created:', agentDefs.length);

  // ─── Sample Appointments ───────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await Promise.all([
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[0].id, professionalId: pro1.id, serviceId: services[0].id, date: today, startTime: '10:00', endTime: '11:00', status: 'confirmed', price: 350 } }),
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[1].id, professionalId: pro1.id, serviceId: services[3].id, date: today, startTime: '11:00', endTime: '12:15', status: 'confirmed', price: 500 } }),
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[4].id, professionalId: admin.id, serviceId: services[6].id, date: today, startTime: '14:00', endTime: '15:00', status: 'pending', price: 450 } }),
    prisma.appointment.create({ data: { tenantId: tenant.id, storeId: store.id, customerId: customers[2].id, professionalId: pro1.id, serviceId: services[4].id, date: tomorrow, startTime: '09:00', endTime: '10:00', status: 'pending', price: 450 } }),
  ]);
  console.log('✅ Sample appointments created');

  console.log('🎉 Seed complete!');
  console.log('📧 Login: admin@glamorapp.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
