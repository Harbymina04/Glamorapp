// Base de conocimiento de Glamy (SaaS). Contenido CURADO por el equipo, con
// rutas REALES del menú (tomadas del sidebar / TENANT_LINKS de la app). Glamy
// SOLO debe responder sobre configuración usando estos artículos; si no hay uno
// que aplique, debe decirlo en vez de inventar.

export interface HelpArticle {
  id: string;
  title: string;
  keywords: string[];
  content: string;
}

export const GLAMY_KNOWLEDGE: HelpArticle[] = [
  {
    id: 'iva-config',
    title: 'Configurar el IVA (precios con IVA incluido o IVA por encima)',
    keywords: ['iva', 'impuesto', 'taxinclusive', 'precio con iva', 'iva incluido', 'tarifa iva', '19%'],
    content:
      'El modo de IVA se define por tienda en **Configuración → pestaña Ventas** (menú "Configuración", /dashboard/settings). ' +
      'El campo "Precios con IVA incluido" (taxInclusive): si está ACTIVO, los precios ya incluyen el IVA y el sistema lo desagrega; ' +
      'si está INACTIVO, el IVA se suma sobre el precio. ' +
      'Las tarifas de IVA (19%, 5%, 0%) se administran a nivel de negocio en **Contabilidad → Tarifas IVA** (/tenant/accounting/tax-rates). ' +
      'Cada producto/servicio puede tener su propia tasa de IVA en su ficha.',
  },
  {
    id: 'plan-billing',
    title: 'Ver o cambiar el plan y la facturación',
    keywords: ['plan', 'facturacion', 'pagar', 'suscripcion', 'actualizar plan', 'precio plan', 'prueba', 'trial'],
    content:
      'El plan y la facturación se gestionan en **Plan y Facturación** (/tenant/billing), accesible solo por el administrador del negocio (rol tenant_admin). ' +
      'Ahí ves tu plan actual, los días de prueba restantes y puedes activar/cambiar tu plan. Cuando termina la prueba se cobra la suscripción.',
  },
  {
    id: 'inventory',
    title: 'Gestionar inventario y stock',
    keywords: ['inventario', 'stock', 'existencias', 'ajustar stock', 'movimiento', 'kardex'],
    content:
      'El inventario está en **Inventario** (/dashboard/inventory): ahí ves el stock de cada producto, sus movimientos y puedes hacer ajustes. ' +
      'El "stock mínimo" de cada producto se define en su ficha dentro de **Catálogo Productos** (/dashboard/catalog/products); ' +
      'cuando el stock baja del mínimo, el producto se marca con alerta de stock bajo.',
  },
  {
    id: 'products',
    title: 'Crear y editar productos del catálogo',
    keywords: ['producto', 'catalogo', 'crear producto', 'precio', 'costo', 'destacado'],
    content:
      'Los productos se administran en **Catálogo Productos** (/dashboard/catalog/products). ' +
      'Ahí defines nombre, precio de venta, costo, stock, stock mínimo, tasa de IVA y si es "Destacado" (la estrella ⭐, que muestra el badge DESTACADO en la tienda online). ' +
      'Los diseños de uñas se gestionan en **Catálogo Uñas** (/dashboard/catalog/nail-designs).',
  },
  {
    id: 'pos-sale',
    title: 'Registrar una venta en el POS y abrir caja',
    keywords: ['venta', 'pos', 'vender', 'cobrar', 'caja', 'abrir caja', 'cerrar caja', 'punto de venta'],
    content:
      'Las ventas se registran en **Ventas POS** (/dashboard/pos). Para cobrar primero debes ABRIR LA CAJA (sesión de caja) desde el mismo POS. ' +
      'Agregas productos/servicios al carrito, aplicas descuentos si aplica, eliges método de pago (efectivo, tarjeta, transferencia o mixto) y confirmas. ' +
      'Para cerrar el día, cierras la caja y el sistema calcula el saldo esperado vs. el real.',
  },
  {
    id: 'appointments',
    title: 'Agendar y gestionar citas',
    keywords: ['cita', 'agenda', 'agendar', 'turno', 'reserva', 'calendario'],
    content:
      'Las citas se gestionan en **Agendamiento** (/dashboard/appointments): puedes ver el calendario, crear citas, asignar profesional y servicio, y cambiar su estado (confirmada, completada, cancelada). ' +
      'Para que los clientes agenden online desde la tienda, activa "Booking Online" por servicio en **Tienda Online → pestaña Servicios** (/tenant/storefront).',
  },
  {
    id: 'commissions',
    title: 'Comisiones de profesionales',
    keywords: ['comision', 'comisiones', 'profesional', 'pagar comision'],
    content:
      'Las comisiones se ven en **Comisiones** (/dashboard/commissions). Se generan automáticamente al completar ventas de servicios que tengan un profesional asignado y una tasa de comisión. ' +
      'Ahí puedes ver lo pendiente por profesional y marcar comisiones como pagadas (lo cual registra un gasto contable).',
  },
  {
    id: 'expenses',
    title: 'Registrar gastos',
    keywords: ['gasto', 'gastos', 'egreso', 'pago', 'factura proveedor'],
    content:
      'Los gastos se registran en **Gastos** (/dashboard/expenses): concepto, monto, categoría, IVA de la compra y método de pago. ' +
      'Los gastos con IVA alimentan el IVA descontable del reporte de impuestos.',
  },
  {
    id: 'accounting-iva',
    title: 'Contabilidad, IVA y reportes fiscales',
    keywords: ['contabilidad', 'iva', 'declaracion', 'formulario 300', 'liquidacion', 'reporte fiscal', 'dian'],
    content:
      'La contabilidad está en **Contabilidad** (/dashboard/accounting o /tenant/accounting). Incluye: Facturas (/tenant/accounting/invoices), ' +
      'Tarifas IVA (/tenant/accounting/tax-rates), Liquidación de IVA / Formulario 300 (/tenant/accounting/liquidacion), ' +
      'Configuración fiscal (/tenant/accounting/config) y Proveedor de Factura Electrónica (/tenant/accounting/fe-provider). ' +
      'El IVA generado del reporte incluye tanto facturas electrónicas como ventas POS.',
  },
  {
    id: 'fe-provider',
    title: 'Factura electrónica (DIAN)',
    keywords: ['factura electronica', 'dian', 'factus', 'fe', 'cufe', 'proveedor fe', 'resolucion'],
    content:
      'La factura electrónica se configura en **Contabilidad → Proveedor FE** (/tenant/accounting/fe-provider). ' +
      'Ahí conectas tu proveedor (ej. Factus) con sus credenciales, y en **Configuración fiscal** (/tenant/accounting/config) defines los datos del emisor (NIT, resolución, prefijo).',
  },
  {
    id: 'storefront',
    title: 'Tienda online (vitrina): visibilidad de productos y servicios',
    keywords: ['tienda online', 'vitrina', 'storefront', 'tienda virtual', 'publicar producto', 'visible'],
    content:
      'La tienda online se administra en **Tienda Online / Mi Vitrina** (/tenant/storefront), con pestañas: Perfil, Productos, Servicios, Sucursales y Comercio. ' +
      'En Productos y Servicios activas la visibilidad de cada uno en la tienda pública. El enlace público de tu tienda es glamorapp.co/tienda/{tu-slug}.',
  },
  {
    id: 'storefront-hours',
    title: 'Horario de atención del salón (Abierto ahora)',
    keywords: ['horario', 'horarios', 'abierto', 'cerrado', 'atencion', 'horas'],
    content:
      'El horario de atención se define en **Tienda Online → pestaña Sucursales** (/tenant/storefront): por cada día activas Abierto/Cerrado y la hora de apertura y cierre. ' +
      'Con eso, la tienda muestra "Abierto ahora / Cerrado" y el horario de hoy en la tarjeta del salón.',
  },
  {
    id: 'storefront-delivery',
    title: 'Domicilio, costo de envío, pedido mínimo y envío gratis',
    keywords: ['domicilio', 'envio', 'delivery', 'pedido minimo', 'envio gratis', 'costo de envio'],
    content:
      'En **Tienda Online → pestaña Comercio** (/tenant/storefront) configuras: si aceptas domicilios, la tarifa de domicilio, el pedido mínimo, ' +
      'y el monto a partir del cual el envío es gratis ("Envío gratis a partir de").',
  },
  {
    id: 'customers',
    title: 'Clientes',
    keywords: ['cliente', 'clientes', 'crm', 'fidelizacion', 'puntos'],
    content:
      'Los clientes se gestionan en **Clientes** (/dashboard/customers): datos de contacto, historial de compras, segmentos y puntos. ' +
      'Puedes asociar un cliente a cada venta en el POS.',
  },
  {
    id: 'discounts',
    title: 'Descuentos y campañas',
    keywords: ['descuento', 'descuentos', 'campaña', 'promocion', 'oferta', 'rebaja'],
    content:
      'Los descuentos/campañas se crean en **Descuentos** (/dashboard/discounts). Defines el % de descuento, el alcance (todos, por categoría o productos específicos), ' +
      'la vigencia y si aplica a la tienda online. Los productos con campaña activa muestran el badge OFERTA en la tienda.',
  },
  {
    id: 'users',
    title: 'Usuarios, roles y permisos',
    keywords: ['usuario', 'usuarios', 'rol', 'permiso', 'empleado', 'cajero', 'profesional', 'invitar'],
    content:
      'Los usuarios se administran en **Usuarios** (/dashboard/users a nivel de sucursal, o /tenant/users a nivel de negocio). ' +
      'Cada usuario tiene un rol (admin de sucursal, cajero, profesional, etc.) que define qué módulos puede ver y editar.',
  },
  {
    id: 'stores',
    title: 'Sucursales',
    keywords: ['sucursal', 'sucursales', 'sede', 'tienda fisica', 'multi sucursal'],
    content:
      'Las sucursales del negocio se administran en **Sucursales** (/tenant/stores). Cada sucursal tiene su propio inventario, caja y configuración. ' +
      'La ubicación (dirección, ciudad, coordenadas) para la tienda online se ajusta en **Tienda Online → Sucursales**.',
  },
  {
    id: 'ai-agents',
    title: 'Agentes de IA y Glamy',
    keywords: ['agente', 'ia', 'glamy', 'inteligencia artificial', 'bot', 'whatsapp'],
    content:
      'Los agentes de IA se configuran en **Agentes IA** (/dashboard/ai-agents) y su consumo en **IA - Consumo** (/tenant/ai-usage). ' +
      'Yo, Glamy, soy tu asistente del panel (disponible en planes con IA). El módulo de IA no está incluido en el plan Básico.',
  },
  {
    id: 'online-orders',
    title: 'Pedidos online de la tienda',
    keywords: ['pedido online', 'pedidos', 'orden online', 'gestionar pedido'],
    content:
      'Los pedidos hechos desde la tienda online se gestionan en **Pedidos Online** (/dashboard/pedidos, o /tenant/storefront/orders). ' +
      'Ahí ves cada pedido y cambias su estado (pendiente → confirmado → preparando → listo → entregado).',
  },
];

/** Busca artículos por coincidencia de palabras clave/título. Devuelve los más relevantes. */
export function searchHelp(query: string, max = 3): HelpArticle[] {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!q.trim()) return [];
  const scored = GLAMY_KNOWLEDGE.map(a => {
    const hay = (a.title + ' ' + a.keywords.join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let score = 0;
    for (const kw of a.keywords) {
      const k = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (q.includes(k) || k.includes(q)) score += 2;
    }
    for (const word of q.split(/\s+/).filter(w => w.length >= 3)) {
      if (hay.includes(word)) score += 1;
    }
    return { a, score };
  }).filter(s => s.score > 0).sort((x, y) => y.score - x.score);
  return scored.slice(0, max).map(s => s.a);
}
