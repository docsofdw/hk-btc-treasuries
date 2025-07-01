'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import numeral from 'numeral';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface DeltaIndicatorProps {
  current: number;
  previous?: number;
  format?: string;
  timeframe?: string;
  updatedAt?: string;
  className?: string;
  showIcon?: boolean;
  showPercentage?: boolean;
}

export function DeltaIndicator({
  current,
  previous,
  format = '0,0.00',
  timeframe = 'WoW',
  updatedAt,
  className = '',
  showIcon = true,
  showPercentage = true,
}: DeltaIndicatorProps) {
  const delta = useMemo(() => {
    if (!previous || previous === 0) return null;
    
    const absoluteChange = current - previous;
    const percentageChange = (absoluteChange / previous) * 100;
    
    return {
      absolute: absoluteChange,
      percentage: percentageChange,
      isPositive: absoluteChange > 0,
      isNegative: absoluteChange < 0,
      isNeutral: absoluteChange === 0,
    };
  }, [current, previous]);

  const formatUpdatedTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = dayjs(timestamp);
    const isRecent = dayjs().diff(date, 'hour') < 2;
    
    if (isRecent) {
      return `Updated ${date.fromNow()}`;
    }
    return `Updated ${date.format('MMM D, YYYY')}`;
  };

  const getIcon = () => {
    if (!showIcon || !delta) return null;
    
    if (delta.isPositive) {
      return <TrendingUp className="h-3 w-3" />;
    } else if (delta.isNegative) {
      return <TrendingDown className="h-3 w-3" />;
    }
    return <Minus className="h-3 w-3" />;
  };

  const getColorClasses = () => {
    if (!delta) return 'text-gray-500';
    
    if (delta.isPositive) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (delta.isNegative) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStalenessWarning = () => {
    if (!updatedAt) return null;
    
    const hoursStale = dayjs().diff(dayjs(updatedAt), 'hour');
    if (hoursStale > 24) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-200">
          ⚠️ Data may be stale ({Math.floor(hoursStale / 24)}d old)
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-gray-900">
          {numeral(current).format(format)}
        </span>
        
        {delta && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getColorClasses()}`}>
            {getIcon()}
            <span>
              {delta.isPositive ? '+' : ''}
              {numeral(delta.absolute).format(format)}
            </span>
            {showPercentage && (
              <span>
                / {delta.isPositive ? '+' : ''}
                {numeral(delta.percentage / 100).format('0.0%')} {timeframe}
              </span>
            )}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {updatedAt && (
          <span>{formatUpdatedTime(updatedAt)}</span>
        )}
        {getStalenessWarning()}
      </div>
    </div>
  );
}