import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { classNames } from '../../lib/utils';

export function StatCard({ title, amount, subtitle, icon, trend, colorClass = 'text-brand-600', bgClass = 'bg-brand-50' }) {
  return (
    <div className="card-hover animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{title}</p>
          <p className={classNames('text-2xl font-bold mt-1', colorClass)}>
            {formatCurrency(amount)}
          </p>
          {subtitle && <p className="text-xs text-surface-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={classNames(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend >= 0 ? 'text-success-600' : 'text-danger-600'
            )}>
              <span>{trend >= 0 ? '^' : 'v'} {Math.abs(trend).toFixed(1)}%</span>
              <span className="text-surface-400 font-normal">vs last month</span>
            </div>
          )}
        </div>
        <div className={classNames('p-3 rounded-xl', bgClass)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
