import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (item: T) => void;
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, keyField = 'id', onRowClick, page = 1, totalPages = 1, total = 0, limit = 10,
  onPageChange, emptyMessage = 'No se encontraron registros',
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary bg-surface-primary/50">
              {columns.map(col => (
                <th key={col.key} className={cn(
                  'text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                  col.className
                )}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr
                  key={item[keyField]}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'border-b border-border-primary/50 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-hover'
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-sm text-foreground', col.className)}>
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary bg-surface-primary/30">
          <p className="text-xs text-muted-foreground">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition',
                  p === page ? 'bg-glamor-primary text-white' : 'text-muted-foreground hover:bg-surface-hover'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
