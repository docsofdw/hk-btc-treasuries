'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import numeral from 'numeral';
import useSWR from 'swr';
import { getHKEXAnnouncementsUrl } from '@/lib/utils';

dayjs.extend(relativeTime);

interface Filing {
  id: string;
  company: string;
  ticker: string;
  type: 'acquisition' | 'disposal' | 'disclosure' | 'update';
  btcAmount: number;
  totalHoldings: number;
  source: string;
  date: string;
  verified: boolean;
  exchange: string;
  documentType?: string;
  title?: string;
  summary?: string;
  listingVenue: string;
  detectedIn?: 'title' | 'body' | 'manual';
}

interface FilingsResponse {
  filings: Filing[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FilingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Fetch real filing data from the API
  const { data, error, isLoading } = useSWR<FilingsResponse>(
    `/api/filings/recent?source=raw&limit=50`, // Get more filings for the full page
    fetcher,
    { 
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      revalidateOnFocus: true
    }
  );

  const typeConfig = {
    acquisition: {
      icon: '📈',
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Acquired'
    },
    disposal: {
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

  const filings = data?.filings || [];

  const filteredFilings = useMemo(() => {
    return filings.filter(filing => {
      const matchesSearch = filing.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           filing.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || filing.type === typeFilter;
      const matchesExchange = exchangeFilter === 'all' || filing.exchange === exchangeFilter;
      const matchesVerified = !verifiedOnly || filing.verified;
      
      return matchesSearch && matchesType && matchesExchange && matchesVerified;
    });
  }, [filings, searchTerm, typeFilter, exchangeFilter, verifiedOnly]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalAcquired = filings
      .filter(f => f.type === 'acquisition')
      .reduce((sum, f) => sum + f.btcAmount, 0);
    const totalSold = filings
      .filter(f => f.type === 'disposal')
      .reduce((sum, f) => sum + Math.abs(f.btcAmount), 0);
    const verifiedCount = filings.filter(f => f.verified).length;
    
    return { totalAcquired, totalSold, verifiedCount };
  }, [filings]);

  // Helper function to get provenance badge
  const getProvenanceBadge = (filing: Filing) => {
    if (filing.verified) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Verified
        </span>
      );
    } else if (filing.detectedIn === 'body') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          <span>📄</span>
          PDF Parsed
        </span>
      );
    } else if (filing.detectedIn === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          <span>✋</span>
          Manual Entry
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          <span>📋</span>
          Title Only
        </span>
      );
    }
  };

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
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-2">Unable to load filings</p>
            <p className="text-sm text-gray-400">Please try refreshing the page</p>
          </div>
        )}

        {/* Content - only show when not loading */}
        {!isLoading && !error && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Total Acquired (All Time)</div>
                <div className="text-2xl font-bold text-green-600">
                  +{numeral(stats.totalAcquired).format('0,0')} BTC
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ≈ ${numeral(stats.totalAcquired * 107000).format('0.0a')}
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Total Sold (All Time)</div>
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
                  {stats.verifiedCount}/{filings.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {filings.length > 0 ? ((stats.verifiedCount / filings.length) * 100).toFixed(0) : 0}% verified
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
                    <option value="disposal">Disposals</option>
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
                    <option value="SEC">SEC</option>
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
                  <p className="text-gray-500 mb-2">
                    {filings.length === 0 ? 'No filings found' : 'No filings match your filters'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {filings.length === 0 
                      ? 'Our scanners check HKEX and SEC filings automatically every 4 hours'
                      : 'Try adjusting your search criteria'
                    }
                  </p>
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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {filing.exchange === 'HKEX' ? (
                                  <a
                                    href={getHKEXAnnouncementsUrl(filing.ticker)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors"
                                  >
                                    {filing.company}
                                  </a>
                                ) : (
                                  <h3 className="font-semibold text-lg text-gray-900">
                                    {filing.company}
                                  </h3>
                                )}
                                <span className="text-sm text-gray-500">
                                  ({filing.ticker})
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded
                                  ${filing.exchange === 'HKEX' ? 'bg-red-100 text-red-700' : 
                                    filing.exchange === 'SEC' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-gray-100 text-gray-700'}`}>
                                  {filing.exchange}
                                </span>
                                {getProvenanceBadge(filing)}
                              </div>
                              
                              <p className="text-gray-700 mb-2">
                                {config.label} <span className="font-semibold">{Math.abs(filing.btcAmount).toLocaleString()} BTC</span>
                                {filing.type !== 'update' && filing.totalHoldings > 0 && (
                                  <span className="text-gray-500">
                                    {' '}• Total holdings: {filing.totalHoldings.toLocaleString()} BTC
                                  </span>
                                )}
                              </p>
                              
                              {filing.title && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={filing.title}>
                                  {filing.title}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                <span>{dayjs(filing.date).format('MMMM D, YYYY')}</span>
                                <span>•</span>
                                <span>{dayjs(filing.date).fromNow()}</span>
                                {filing.documentType && (
                                  <>
                                    <span>•</span>
                                    <span>{filing.documentType}</span>
                                  </>
                                )}
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
                <p className="mt-1">
                  Showing {filteredFilings.length} of {filings.length} total filings • 
                  <span className="text-orange-600 ml-1">
                    Auto-scanned every 4 hours from HKEX & SEC filing databases
                  </span>
                </p>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
} 