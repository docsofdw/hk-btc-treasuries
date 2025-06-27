'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import TreasuryTable from '@/components/treasuries/TreasuryTable';
import EmbedModal from '@/components/ui/EmbedModal';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, error, isLoading, mutate } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries',
    fetcher,
    {
      refreshInterval: 3600000, // 1 hour
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        if (data.bitcoin?.usd) {
          setBtcPrice(data.bitcoin.usd);
        }
      })
      .catch(console.error);
  }, []);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Hong Kong & China Bitcoin Treasuries
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setShowEmbedModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Embed
              </button>
            </div>
          </div>
          <p className="text-lg text-gray-600 mb-2">
            Tracking publicly disclosed Bitcoin holdings by Hong Kong-listed and China-headquartered companies
          </p>
          <p className="text-sm text-gray-500">
            Data verified from official filings, press releases, and regulatory disclosures
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Error loading data. Please refresh the page.
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading treasury data...</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {data?.entities && data.entities.length > 0 ? (
          <TreasuryTable data={data.entities} btcPrice={btcPrice} />
        ) : (
          !isLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No treasury data available yet.</p>
              <a 
                href="/admin/add-entity" 
                className="inline-flex items-center gap-2 text-brand hover:text-brand-light transition-colors"
              >
                Add first entity
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          )
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-4">
              Not investment advice. All data from public sources.
            </p>
            <div className="flex items-center justify-center space-x-6">
              <a
                href="https://github.com/duke/hk-btc-treasuries"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://twitter.com/YOUR_HANDLE"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Embed Modal */}
      <EmbedModal 
        isOpen={showEmbedModal} 
        onClose={() => setShowEmbedModal(false)}
        siteUrl={siteUrl}
      />
    </main>
  );
}
