import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string; positive?: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-border-primary p-5 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-[28px] font-bold text-foreground mt-1 leading-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.positive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={cn('text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-glamor-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
