'use client';

import { useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from '@/components/ui/button';
import { getHKEXAnnouncementsUrl } from '@/lib/utils';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  DocumentTextIcon,
  ArrowPathIcon,
  TableCellsIcon,
  Squares2X2Icon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

dayjs.extend(relativeTime);

// Simplified Filing interface
interface Filing {
  id: string;
  company: string;
  ticker: string;
  filing_type: 'acquisition' | 'disposal' | 'update' | 'disclosure';
  btc_amount: number | null;
  total_holdings: number | null;
  pdf_url: string;
  date: string;
  verified: boolean;
  title?: string;
}

interface FilingsResponse {
  filings: Filing[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Pure function for filing icon
function filingIcon(filing: Filing) {
  switch (filing.filing_type) {
    case 'acquisition':
      return <ArrowUpIcon className="w-5 h-5" />;
    case 'disposal':
      return <ArrowDownIcon className="w-5 h-5" />;
    case 'update':
      return <ArrowPathIcon className="w-5 h-5" />;
    default:
      return <DocumentTextIcon className="w-5 h-5" />;
  }
}

// Pure function for filing label
function filingLabel(filing: Filing): string {
  switch (filing.filing_type) {
    case 'acquisition':
      return 'Acquired';
    case 'disposal':
      return 'Sold';
    case 'update':
      return 'Updated';
    default:
      return 'Disclosed';
  }
}

// Filing type styling
const filingTypeStyles = {
  acquisition: {
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  disposal: {
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  update: {
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  disclosure: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
};

export default function RecentFilings() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Fetch from the consolidated endpoint with query parameters
  const { data, error, isLoading } = useSWR<FilingsResponse>(
    '/api/filings/recent?source=raw&exchange=HKEX&limit=20',
    fetcher,
    { refreshInterval: 15 * 60 * 1000 } // 15 minutes
  );

  if (isLoading) {
    return (
      <div className="mt-8 sm:mt-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Bitcoin Filings</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hong Kong (--)</span>
          </div>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 animate-pulse">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 sm:mt-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Bitcoin Filings</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500">Unable to load recent filings</p>
          <p className="text-sm text-gray-400 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const filings = data?.filings || [];

  return (
    <div className="mt-8 sm:mt-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Bitcoin Filings</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Hong Kong ({filings.length})</span>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              onClick={() => setViewMode('cards')}
              className="h-7 px-2"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              onClick={() => setViewMode('table')}
              className="h-7 px-2"
            >
              <TableCellsIcon className="w-4 h-4" />
            </Button>
          </div>
          <a 
            href="/filings" 
            className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 transition-colors"
          >
            View all →
          </a>
        </div>
      </div>

      {filings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500">No recent filings found</p>
          <p className="text-sm text-gray-400 mt-1">HKEX filings are scanned automatically every 2 hours</p>
        </div>
      ) : viewMode === 'cards' ? (
        // Card View
        <div className="space-y-3 sm:space-y-4">
          {filings.map((filing) => {
            const styles = filingTypeStyles[filing.filing_type];
            
            return (
              <div 
                key={filing.id}
                className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1">
                    <div className={`${styles.bg} rounded-lg p-2 sm:p-3 ${styles.color} flex-shrink-0`}>
                      {filingIcon(filing)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <a
                          href={getHKEXAnnouncementsUrl(filing.ticker)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-900 text-sm sm:text-base truncate hover:text-blue-600 transition-colors"
                        >
                          {filing.company}
                        </a>
                        <span className="text-xs sm:text-sm text-gray-500">
                          ({filing.ticker})
                        </span>
                        {!filing.verified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            Unverified
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                        {filingLabel(filing)}{' '}
                        {filing.btc_amount !== null && (
                          <span className="font-semibold">
                            {Math.abs(filing.btc_amount).toLocaleString()} BTC
                          </span>
                        )}
                        {filing.total_holdings !== null && filing.total_holdings > 0 && (
                          <span className="text-gray-500 hidden sm:inline">
                            {' '}• Total: {filing.total_holdings.toLocaleString()} BTC
                          </span>
                        )}
                      </p>
                      
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
                        <span>{dayjs(filing.date).fromNow()}</span>
                        <a 
                          href={filing.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-orange-600 transition-colors"
                        >
                          View filing →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Table View
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BTC Δ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filings.map((filing) => {
                const styles = filingTypeStyles[filing.filing_type];
                
                return (
                  <tr key={filing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`${styles.bg} rounded p-1 ${styles.color}`}>
                          {filingIcon(filing)}
                        </div>
                        <div>
                          <a
                            href={getHKEXAnnouncementsUrl(filing.ticker)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {filing.company}
                          </a>
                          <div className="text-xs text-gray-500">{filing.ticker}</div>
                        </div>
                        {filing.verified && (
                          <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${styles.color}`}>
                        {filing.btc_amount !== null 
                          ? `${filing.filing_type === 'disposal' ? '-' : '+'}${Math.abs(filing.btc_amount).toLocaleString()}`
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {filing.total_holdings !== null 
                        ? filing.total_holdings.toLocaleString()
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {dayjs(filing.date).fromNow()}
                      </div>
                      <a 
                        href={filing.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:text-orange-700"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status indicator */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          <span className="text-orange-600">
            {filings.length} recent filing{filings.length !== 1 ? 's' : ''}
          </span>
          {' '}• Auto-scanned every 2 hours from HKEX
        </p>
      </div>
    </div>
  );
} 