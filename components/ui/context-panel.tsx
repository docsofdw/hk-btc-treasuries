'use client';

import { useMemo } from 'react';
import numeral from 'numeral';
import { Info, Globe, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RegionalComparison {
  region: string;
  percentage: number;
  totalBtc: number;
  companies: number;
  color: string;
}

interface ContextPanelProps {
  asiaTotalBtc: number;
  asiaCompanyCount: number;
  className?: string;
}

const GLOBAL_REFERENCE_DATA = {
  totalBtcSupply: 19750000, // Approximate current supply
  usCorporateBtc: 400000, // Approximate US corporate holdings
  usCompanyCount: 45, // Approximate number of US companies
};

export function ContextPanel({
  asiaTotalBtc,
  asiaCompanyCount,
  className = '',
}: ContextPanelProps) {
  const comparisons = useMemo((): RegionalComparison[] => {
    const asiaPercentage = (asiaTotalBtc / GLOBAL_REFERENCE_DATA.totalBtcSupply) * 100;
    const usPercentage = (GLOBAL_REFERENCE_DATA.usCorporateBtc / GLOBAL_REFERENCE_DATA.totalBtcSupply) * 100;
    
    return [
      {
        region: 'Asia (HK + China)',
        percentage: asiaPercentage,
        totalBtc: asiaTotalBtc,
        companies: asiaCompanyCount,
        color: 'text-red-600 bg-red-50 border-red-200',
      },
      {
        region: 'United States',
        percentage: usPercentage,
        totalBtc: GLOBAL_REFERENCE_DATA.usCorporateBtc,
        companies: GLOBAL_REFERENCE_DATA.usCompanyCount,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
      },
    ];
  }, [asiaTotalBtc, asiaCompanyCount]);

  const insights = useMemo(() => {
    const asiaVsUs = (asiaTotalBtc / GLOBAL_REFERENCE_DATA.usCorporateBtc) * 100;
    const adoptionGap = GLOBAL_REFERENCE_DATA.usCompanyCount - asiaCompanyCount;
    
    return {
      adoptionRatio: asiaVsUs,
      adoptionGap,
      isAsiaLeading: asiaVsUs > 100,
      marketOpportunity: adoptionGap > 0 ? `${adoptionGap} more companies` : 'Market saturated',
    };
  }, [asiaTotalBtc, asiaCompanyCount]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Global Context</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-xs">
              Comparison with US corporate adoption based on public filings and Bitcoin treasury data.
              Asia includes Hong Kong-listed and China-headquartered companies.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-4">
        {/* Regional Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comparisons.map((comparison) => (
            <div key={comparison.region} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {comparison.region}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${comparison.color}`}>
                  {numeral(comparison.percentage / 100).format('0.00%')} of supply
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{numeral(comparison.totalBtc).format('0,0')} BTC</span>
                  <span>{comparison.companies} companies</span>
                </div>
                
                {/* Visual bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${comparison.region.includes('Asia') ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(comparison.percentage * 20, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Insights */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Market Insights</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-600">Asia vs US Holdings</div>
              <div className="font-semibold text-gray-900">
                {numeral(insights.adoptionRatio / 100).format('0.0%')}
                <span className="text-gray-500 font-normal ml-1">
                  {insights.isAsiaLeading ? 'ahead' : 'of US total'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-600">Adoption Gap</div>
              <div className="font-semibold text-gray-900">
                {insights.adoptionGap > 0 ? `+${insights.adoptionGap}` : '0'}
                <span className="text-gray-500 font-normal ml-1">companies behind</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-600">Supply Impact</div>
              <div className="font-semibold text-gray-900">
                {numeral((asiaTotalBtc / GLOBAL_REFERENCE_DATA.totalBtcSupply) * 100).format('0.000')}%
                <span className="text-gray-500 font-normal ml-1">of total BTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Context */}
        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
          <div className="flex items-start gap-2">
            <div className="text-orange-600 mt-0.5">🏛️</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-800 mb-1">
                Regulatory Runway
              </div>
              <div className="text-xs text-orange-700">
                Hong Kong SFC consultations ongoing. Formal corporate BTC approval expected 2025.
                <span className="font-medium"> Early mover advantage window still open.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}