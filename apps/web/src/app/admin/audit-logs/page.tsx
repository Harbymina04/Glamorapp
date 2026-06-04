'use client';

import { useAuthStore } from '@/stores/auth-store';
import { AuditLogTable } from '@/components/shared/audit-log-table';
import { Shield } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { token } = useAuthStore();
  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-glamor-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro de Actividad — Plataforma</h1>
          <p className="text-sm text-muted-foreground">Historial global de todos los tenants</p>
        </div>
      </div>

      <AuditLogTable
        endpoint="/admin/audit-logs"
        token={token}
        showStoreFilter
      />
    </div>
  );
}
