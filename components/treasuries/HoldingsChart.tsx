'use client';

import { useMemo } from 'react';
import numeral from 'numeral';
import { TreasuryEntity } from '@/types/treasury';

interface HoldingsChartProps {
  data: TreasuryEntity[];
}

export default function HoldingsChart({ data }: HoldingsChartProps) {
  const chartData = useMemo(() => {
    // Get top 10 holdings
    const sorted = [...data].sort((a, b) => b.btc - a.btc).slice(0, 10);
    const totalBtc = sorted.reduce((sum, entity) => sum + entity.btc, 0);
    
    return sorted.map((entity, index) => ({
      ...entity,
      percentage: (entity.btc / totalBtc) * 100,
      color: [
        '#f97316', // orange-500
        '#fb923c', // orange-400
        '#fdba74', // orange-300
        '#fed7aa', // orange-200
        '#ffedd5', // orange-100
        '#94a3b8', // slate-400
        '#cbd5e1', // slate-300
        '#e2e8f0', // slate-200
        '#f1f5f9', // slate-100
        '#f8fafc', // slate-50
      ][index]
    }));
  }, [data]);

  const maxBtc = Math.max(...chartData.map(d => d.btc));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Top 10 Bitcoin Holdings</h3>
      
      <div className="space-y-2.5 sm:space-y-3">
        {chartData.map((entity, index) => (
          <div key={entity.id} className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 sm:w-12 text-xs sm:text-sm text-gray-500 text-right">#{index + 1}</div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">{entity.legalName}</span>
                  <span className="text-xs text-gray-500 hidden sm:inline">({entity.ticker})</span>
                </div>
                <span className="text-xs sm:text-sm font-mono font-medium ml-2">{numeral(entity.btc).format('0,0')}</span>
              </div>
              
              <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                <div 
                  className="h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(entity.btc / maxBtc) * 100}%`,
                    backgroundColor: entity.color
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500">Total (Top 10)</span>
          <span className="font-mono font-medium">
            {numeral(chartData.reduce((sum, d) => sum + d.btc, 0)).format('0,0')} BTC
          </span>
        </div>
      </div>
    </div>
  );
} 