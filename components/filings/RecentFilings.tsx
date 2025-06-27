'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Filing {
  id: string;
  company: string;
  ticker: string;
  type: 'acquisition' | 'sale' | 'disclosure';
  btcAmount: number;
  totalHoldings: number;
  source: string;
  date: string;
  verified: boolean;
}

export default function RecentFilings() {
  const [filings, setFilings] = useState<Filing[]>([
    {
      id: '1',
      company: 'MicroStrategy Inc.',
      ticker: 'MSTR',
      type: 'acquisition',
      btcAmount: 14620,
      totalHoldings: 189150,
      source: 'https://www.sec.gov/filing',
      date: '2024-01-15',
      verified: true
    },
    {
      id: '2',
      company: 'Tesla Inc.',
      ticker: 'TSLA',
      type: 'disclosure',
      btcAmount: 42000,
      totalHoldings: 42000,
      source: 'https://www.sec.gov/filing',
      date: '2024-01-12',
      verified: true
    },
    {
      id: '3',
      company: 'Marathon Digital Holdings',
      ticker: 'MARA',
      type: 'acquisition',
      btcAmount: 850,
      totalHoldings: 15000,
      source: 'https://www.sec.gov/filing',
      date: '2024-01-10',
      verified: true
    },
    {
      id: '4',
      company: 'Block Inc.',
      ticker: 'SQ',
      type: 'sale',
      btcAmount: -500,
      totalHoldings: 8000,
      source: 'https://www.sec.gov/filing',
      date: '2024-01-08',
      verified: false
    }
  ]);

  const typeConfig = {
    acquisition: {
      icon: '📈',
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Acquired'
    },
    sale: {
      icon: '📉',
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Sold'
    },
    disclosure: {
      icon: '📄',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: 'Disclosed'
    }
  };

  return (
    <div className="mt-8 sm:mt-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Bitcoin Filings</h2>
        <a 
          href="/filings" 
          className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 transition-colors"
        >
          View all filings →
        </a>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filings.map((filing) => {
          const config = typeConfig[filing.type];
          
          return (
            <div 
              key={filing.id}
              className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className={`${config.bg} rounded-lg p-2 sm:p-3 ${config.color} flex-shrink-0`}>
                    <span className="text-lg sm:text-2xl">{config.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {filing.company}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500">
                        ({filing.ticker})
                      </span>
                      {filing.verified && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                      {config.label} <span className="font-semibold">{Math.abs(filing.btcAmount).toLocaleString()} BTC</span>
                      {filing.type === 'acquisition' && (
                        <span className="text-gray-500 hidden sm:inline">
                          {' '}• Total holdings: {filing.totalHoldings.toLocaleString()} BTC
                        </span>
                      )}
                    </p>
                    
                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
                      <span>{dayjs(filing.date).fromNow()}</span>
                      <a 
                        href={filing.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-600 transition-colors"
                      >
                        View filing →
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="text-xs sm:text-sm text-gray-500">Value</div>
                  <div className="font-semibold text-sm sm:text-base">
                    ${(Math.abs(filing.btcAmount) * 107000).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Mobile value display */}
              <div className="sm:hidden mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Value</span>
                <span className="text-xs font-semibold">
                  ${(Math.abs(filing.btcAmount) * 107000).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 