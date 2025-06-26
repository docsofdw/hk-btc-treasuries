'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import TreasuryTable from '@/components/treasuries/TreasuryTable';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [btcPrice, setBtcPrice] = useState(107000);
  
  const { data, error, isLoading } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries',
    fetcher,
    {
      refreshInterval: 3600000, // 1 hour
      revalidateOnFocus: false,
    }
  );

  // Optional: Fetch live BTC price
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand mb-4">
            Hong Kong & China Bitcoin Treasuries
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Tracking publicly disclosed Bitcoin holdings by Hong Kong-listed and China-headquartered companies
          </p>
          <p className="text-sm text-gray-500">
            Data verified from official filings, press releases, and regulatory disclosures
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            Error loading data. Please refresh the page.
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          </div>
        )}

        {/* Data Table */}
        {data?.entities && (
          <TreasuryTable data={data.entities} btcPrice={btcPrice} />
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              Not investment advice. All data from public sources.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/YOUR_USERNAME/hk-btc-treasuries"
                className="text-brand hover:text-brand-light transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <span>·</span>
              <a
                href="https://twitter.com/YOUR_HANDLE"
                className="text-brand hover:text-brand-light transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
