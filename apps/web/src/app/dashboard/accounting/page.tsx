'use client';

import { Calculator } from 'lucide-react';

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
        <p className="text-sm text-muted-foreground mt-1">NIIF para PYMES — Colombia</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Calculator className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Módulo en desarrollo</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          El módulo de contabilidad estará disponible próximamente. Incluirá:
        </p>
        <ul className="text-sm text-muted-foreground mt-4 space-y-1 max-w-sm mx-auto text-left">
          <li>• Catálogo de cuentas (PUC Colombia)</li>
          <li>• Libro diario y mayor</li>
          <li>• Estados financieros (ESFA, resultados)</li>
          <li>• Impuestos (IVA 19%, retefuente, ICA)</li>
          <li>• Facturación electrónica DIAN</li>
          <li>• Cierres contables mensuales/anuales</li>
        </ul>
      </div>
    </div>
  );
}
