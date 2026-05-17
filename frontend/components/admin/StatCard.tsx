'use client';

import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color?: string;
  format?: 'currency' | 'percentage' | 'rating' | 'number';
}

export function StatCard({ title, value, icon: Icon, trend, color = 'bg-gradient-to-r from-orange-500 to-orange-600', format }: StatCardProps) {
  // Auto-detect format based on title or use provided format
  const getFormatType = (): string => {
    if (format) return format;
    if (title === 'Avg Rating') return 'rating';
    if (title === 'Completion Rate') return 'percentage';
    if (title === 'Total Revenue') return 'currency';
    return 'number';
  };

  // Format the display value
  const getDisplayValue = () => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    const formatType = getFormatType();
    
    if (isNaN(numValue)) {
      return formatType === 'currency' ? '৳0' : formatType === 'percentage' ? '0%' : '0';
    }
    
    switch (formatType) {
      case 'currency':
        return `৳${numValue.toLocaleString()}`;
      case 'percentage':
        return `${Math.round(numValue)}%`;
      case 'rating':
        return numValue.toFixed(1);
      case 'number':
      default:
        return numValue.toLocaleString();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {getDisplayValue()}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}% from last month
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}