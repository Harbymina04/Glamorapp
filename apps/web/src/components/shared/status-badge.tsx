import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  colors?: Record<string, string>;
  label?: string;
  labels?: Record<string, string>;
}

const defaultColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-gray-50 text-gray-600 border-gray-200',
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
};

export function StatusBadge({ status, colors = defaultColors, label, labels }: StatusBadgeProps) {
  const colorClass = colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  const displayLabel = label || labels?.[status] || status.replace(/_/g, ' ');

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      colorClass
    )}>
      {displayLabel}
    </span>
  );
}
