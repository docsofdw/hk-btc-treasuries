'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import numeral from 'numeral';

dayjs.extend(relativeTime);

interface Filing {
  id: string;
  company: string;
  ticker: string;
  type: 'acquisition' | 'sale' | 'disclosure' | 'update';
  btcAmount: number;
  totalHoldings: number;
  source: string;
  date: string;
  verified: boolean;
  exchange: string;
  details?: string;
}

// Mock data - in production, this would come from an API
const mockFilings: Filing[] = [
  {
    id: '1',
    company: 'MicroStrategy Inc.',
    ticker: 'MSTR',
    type: 'acquisition',
    btcAmount: 14620,
    totalHoldings: 189150,
    source: 'https://www.sec.gov/filing/1',
    date: '2024-01-15',
    verified: true,
    exchange: 'NASDAQ',
    details: 'Purchased 14,620 BTC for approximately $615.7 million at an average price of $42,110 per bitcoin'
  },
  {
    id: '2',
    company: 'Tesla Inc.',
    ticker: 'TSLA',
    type: 'disclosure',
    btcAmount: 42000,
    totalHoldings: 42000,
    source: 'https://www.sec.gov/filing/2',
    date: '2024-01-12',
    verified: true,
    exchange: 'NASDAQ',
    details: 'Q4 2023 earnings report disclosed Bitcoin holdings'
  },
  {
    id: '3',
    company: 'Marathon Digital Holdings',
    ticker: 'MARA',
    type: 'acquisition',
    btcAmount: 850,
    totalHoldings: 15000,
    source: 'https://www.sec.gov/filing/3',
    date: '2024-01-10',
    verified: true,
    exchange: 'NASDAQ',
    details: 'Mined 850 BTC in December 2023'
  },
  {
    id: '4',
    company: 'Block Inc.',
    ticker: 'SQ',
    type: 'sale',
    btcAmount: -500,
    totalHoldings: 8000,
    source: 'https://www.sec.gov/filing/4',
    date: '2024-01-08',
    verified: false,
    exchange: 'NYSE',
    details: 'Sold portion of Bitcoin holdings for liquidity'
  },
  {
    id: '5',
    company: 'Boyaa Interactive',
    ticker: '0434.HK',
    type: 'acquisition',
    btcAmount: 1000,
    totalHoldings: 2641,
    source: 'https://www.hkexnews.hk/filing/5',
    date: '2024-01-05',
    verified: true,
    exchange: 'HKEX',
    details: 'Strategic Bitcoin acquisition announced'
  },
  {
    id: '6',
    company: 'Meitu Inc.',
    ticker: '1357.HK',
    type: 'update',
    btcAmount: 0,
    totalHoldings: 940,
    source: 'https://www.hkexnews.hk/filing/6',
    date: '2024-01-03',
    verified: true,
    exchange: 'HKEX',
    details: 'Annual report update on crypto holdings'
  }
];

export default function FilingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

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
    },
    update: {
      icon: '🔄',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      label: 'Updated'
    }
  };

  const filteredFilings = useMemo(() => {
    return mockFilings.filter(filing => {
      const matchesSearch = filing.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           filing.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || filing.type === typeFilter;
      const matchesExchange = exchangeFilter === 'all' || filing.exchange === exchangeFilter;
      const matchesVerified = !verifiedOnly || filing.verified;
      
      return matchesSearch && matchesType && matchesExchange && matchesVerified;
    });
  }, [searchTerm, typeFilter, exchangeFilter, verifiedOnly]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAcquired = mockFilings
      .filter(f => f.type === 'acquisition')
      .reduce((sum, f) => sum + f.btcAmount, 0);
    const totalSold = mockFilings
      .filter(f => f.type === 'sale')
      .reduce((sum, f) => sum + Math.abs(f.btcAmount), 0);
    const verifiedCount = mockFilings.filter(f => f.verified).length;
    
    return { totalAcquired, totalSold, verifiedCount };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Bitcoin Treasury Filings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Acquired (30d)</div>
            <div className="text-2xl font-bold text-green-600">
              +{numeral(stats.totalAcquired).format('0,0')} BTC
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${numeral(stats.totalAcquired * 107000).format('0.0a')}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Sold (30d)</div>
            <div className="text-2xl font-bold text-red-600">
              -{numeral(stats.totalSold).format('0,0')} BTC
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${numeral(stats.totalSold * 107000).format('0.0a')}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Verified Filings</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.verifiedCount}/{mockFilings.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((stats.verifiedCount / mockFilings.length) * 100).toFixed(0)}% verified
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Company or ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Types</option>
                <option value="acquisition">Acquisitions</option>
                <option value="sale">Sales</option>
                <option value="disclosure">Disclosures</option>
                <option value="update">Updates</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exchange
              </label>
              <select
                value={exchangeFilter}
                onChange={(e) => setExchangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Exchanges</option>
                <option value="HKEX">HKEX</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Verified only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Filings List */}
        <div className="space-y-4">
          {filteredFilings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No filings match your filters</p>
            </div>
          ) : (
            filteredFilings.map((filing) => {
              const config = typeConfig[filing.type];
              
              return (
                <div 
                  key={filing.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`${config.bg} rounded-lg p-3 ${config.color}`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {filing.company}
                            </h3>
                            <span className="text-sm text-gray-500">
                              ({filing.ticker})
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded
                              ${filing.exchange === 'HKEX' ? 'bg-red-100 text-red-700' : 
                                filing.exchange === 'NASDAQ' ? 'bg-blue-100 text-blue-700' : 
                                'bg-purple-100 text-purple-700'}`}>
                              {filing.exchange}
                            </span>
                            {filing.verified && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-700 mb-2">
                            {config.label} <span className="font-semibold">{Math.abs(filing.btcAmount).toLocaleString()} BTC</span>
                            {filing.type !== 'update' && (
                              <span className="text-gray-500">
                                {' '}• Total holdings: {filing.totalHoldings.toLocaleString()} BTC
                              </span>
                            )}
                          </p>
                          
                          {filing.details && (
                            <p className="text-sm text-gray-600 mb-2">{filing.details}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{dayjs(filing.date).format('MMMM D, YYYY')}</span>
                            <span>•</span>
                            <span>{dayjs(filing.date).fromNow()}</span>
                            <a 
                              href={filing.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 hover:text-orange-700 transition-colors"
                            >
                              View filing →
                            </a>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Value</div>
                          <div className="font-semibold text-lg">
                            ${numeral(Math.abs(filing.btcAmount) * 107000).format('0.0a')}
                          </div>
                          <div className="text-xs text-gray-500">
                            @ $107,000/BTC
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>Filings data is aggregated from public sources and may not be complete.</p>
          </div>
        </footer>
      </div>
    </main>
  );
} 