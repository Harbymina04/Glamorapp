import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Glamorapp',
  description: 'Política de tratamiento de datos personales de Glamorapp.',
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Política de Privacidad</h1>
      <p className="text-sm text-gray-400 mb-8">Última actualización: junio de 2026</p>

      <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-gray-900 mb-1">1. Datos que recopilamos</h2>
          <p>Recopilamos los datos que nos proporcionas al crear tu cuenta o realizar un pedido (nombre, correo, teléfono y dirección de entrega) y los necesarios para procesar tus compras y citas.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">2. Uso de los datos</h2>
          <p>Usamos tus datos para procesar pedidos y citas, enviarte notificaciones relacionadas con tus compras y mejorar tu experiencia. No vendemos tu información a terceros.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">3. Compartir con salones</h2>
          <p>Cuando realizas un pedido o agendas una cita, compartimos los datos necesarios con el salón correspondiente para que pueda atenderte.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">4. Tus derechos</h2>
          <p>De acuerdo con la Ley 1581 de 2012 de Colombia, puedes conocer, actualizar, rectificar o solicitar la eliminación de tus datos escribiendo a <a href="mailto:soporte@glamorapp.co" className="text-[#EF2D8F]">soporte@glamorapp.co</a>.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900 mb-1">5. Contacto</h2>
          <p>Para ejercer tus derechos o resolver dudas sobre el tratamiento de tus datos, escríbenos a <a href="mailto:soporte@glamorapp.co" className="text-[#EF2D8F]">soporte@glamorapp.co</a>.</p>
        </section>
      </div>
    </div>
  );
}
