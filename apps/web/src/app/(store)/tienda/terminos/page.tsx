import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Glamorapp',
  description: 'Términos y condiciones de uso de la tienda Glamorapp.',
};

export default function TerminosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 prose prose-sm prose-gray">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Términos y Condiciones</h1>
      <p className="text-sm text-gray-400 mb-8">Última actualización: junio de 2026</p>

      <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-gray-900 mb-1">1. Aceptación</h2>
          <p>Al usar Glamorapp aceptas estos términos. Glamorapp es una plataforma que conecta a clientes con salones de belleza para la compra de productos y el agendamiento de servicios.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">2. Pedidos y pagos</h2>
          <p>Los precios se muestran en pesos colombianos (COP) e incluyen los impuestos aplicables. Cada salón es responsable de la preparación, entrega o prestación de los productos y servicios que ofrece. Los pagos en línea se procesan a través de proveedores autorizados.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">3. Citas</h2>
          <p>El agendamiento de citas está sujeto a la disponibilidad de cada salón. El salón puede confirmar, reprogramar o cancelar una cita comunicándose contigo.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">4. Cambios y devoluciones</h2>
          <p>Las políticas de cambio y devolución dependen de cada salón. Para solicitudes, comunícate con el salón o escríbenos a <a href="mailto:soporte@glamorapp.co" className="text-[#EF2D8F]">soporte@glamorapp.co</a>.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">5. Contacto</h2>
          <p>Para cualquier consulta puedes escribirnos a <a href="mailto:soporte@glamorapp.co" className="text-[#EF2D8F]">soporte@glamorapp.co</a>.</p>
        </section>
      </div>
    </div>
  );
}
