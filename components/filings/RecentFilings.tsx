'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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

export default function RecentFilings() {
  // Fetch real filing data from the API
  const { data, error, isLoading } = useSWR<FilingsResponse>(
    `/api/filings/recent?source=raw&limit=8`, // Use raw_filings table
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

  // Handle loading and error states
  if (isLoading) {
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
          <a 
            href="/filings" 
            className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 transition-colors"
          >
            View all filings →
          </a>
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
        <a 
          href="/filings" 
          className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 transition-colors"
        >
          View all filings →
        </a>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No recent filings found</p>
            <p className="text-sm text-gray-400 mt-1">Our scanners check HKEX and SEC filings automatically every 4 hours</p>
            <p className="text-xs text-gray-400 mt-1">Next scan: within the next few hours</p>
          </div>
        ) : (
          filings.map((filing) => {
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
                        {filing.exchange === 'HKEX' ? (
                          <a
                            href={getHKEXAnnouncementsUrl(filing.ticker)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 text-sm sm:text-base truncate hover:text-blue-600 transition-colors"
                          >
                            {filing.company}
                          </a>
                        ) : (
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {filing.company}
                          </h3>
                        )}
                        <span className="text-xs sm:text-sm text-gray-500">
                          ({filing.ticker})
                        </span>
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded
                          ${filing.exchange === 'HKEX' ? 'bg-red-100 text-red-700' : 
                            filing.exchange === 'SEC' ? 'bg-blue-100 text-blue-700' : 
                            'bg-gray-100 text-gray-700'}`}>
                          {filing.exchange}
                        </span>
                        {getProvenanceBadge(filing)}
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                        {config.label} <span className="font-semibold">{Math.abs(filing.btcAmount).toLocaleString()} BTC</span>
                        {filing.type !== 'update' && filing.totalHoldings > 0 && (
                          <span className="text-gray-500 hidden sm:inline">
                            {' '}• Total holdings: {filing.totalHoldings.toLocaleString()} BTC
                          </span>
                        )}
                      </p>

                      {filing.title && (
                        <p className="text-xs text-gray-500 mb-1.5 truncate" title={filing.title}>
                          {filing.title}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
                        <span>{dayjs(filing.date).fromNow()}</span>
                        {filing.documentType && (
                          <span className="hidden sm:inline">• {filing.documentType}</span>
                        )}
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
          })
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Data refreshed {data ? 'recently' : 'loading...'} • 
          <span className="text-orange-600 ml-1">
            {filings.length} recent filing{filings.length !== 1 ? 's' : ''}
          </span>
          <br />
          <span className="text-gray-400 mt-1">
            Auto-scanned every 4 hours from HKEX & SEC filing databases
          </span>
        </p>
      </div>
    </div>
  );
} 