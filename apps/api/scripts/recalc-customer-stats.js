// Recalcula stats de clientes basado en ventas completadas
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Obtener todos los clientes activos
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, customerNumber: true, tenantId: true, storeId: true },
  });

  console.log(`Recalculando stats para ${customers.length} clientes...\n`);

  for (const c of customers) {
    // Agregar ventas completadas
    const stats = await prisma.sale.aggregate({
      where: {
        tenantId: c.tenantId,
        storeId: c.storeId,
        customerId: c.id,
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    const lastSale = await prisma.sale.findFirst({
      where: {
        tenantId: c.tenantId,
        storeId: c.storeId,
        customerId: c.id,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    const totalSpent = stats._sum.total || 0;
    const totalPurchases = stats._count;
    const averageTicket = totalPurchases > 0 ? Number(totalSpent) / totalPurchases : 0;

    await prisma.customer.update({
      where: { id: c.id },
      data: {
        totalSpent,
        totalPurchases,
        averageTicket,
        lastPurchaseAt: lastSale?.completedAt || null,
      },
    });

    const spentStr = Number(totalSpent).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    console.log(`  ${c.customerNumber} ${c.firstName} ${c.lastName}: ${totalPurchases} compras, ${spentStr}, ticket prom $${averageTicket.toFixed(0)}`);
  }

  console.log('\n✅ Recalculo completado.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
