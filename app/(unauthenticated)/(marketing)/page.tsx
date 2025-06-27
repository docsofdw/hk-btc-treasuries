'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import numeral from 'numeral';
import Link from 'next/link';
import EnhancedTreasuryTable from '@/components/treasuries/EnhancedTreasuryTable';
import HoldingsChart from '@/components/treasuries/HoldingsChart';
import RecentFilings from '@/components/filings/RecentFilings';
import { ShareButton } from '@/components/ui/share-button';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  
  const { data, error, isLoading, mutate } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    // Fetch live price
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await res.json();
        if (data.bitcoin?.usd) {
          setBtcPrice(data.bitcoin.usd);
        }
      } catch (error) {
        console.error('Error fetching BTC price:', error);
      }
    };
    
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-0 sm:h-20">
            {/* Logo and Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0">
              <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Asia's Bitcoin Treasuries
              </h1>
              
              <nav className="flex items-center gap-6 sm:ml-8">
                <Link 
                  href="/" 
                  className="text-base sm:text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Hong Kong & China
                </Link>
                <Link 
                  href="/about" 
                  className="text-base sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </Link>
              </nav>
            </div>
            
            {/* Price and Share Button */}
            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 mt-3 sm:mt-0">
              <div className="flex items-center gap-3">
                <div className="bg-orange-50 rounded-xl px-4 py-2.5 border border-orange-200">
                  <div className="text-xs text-gray-600 font-medium mb-0.5">BTC Price</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {numeral(btcPrice).format('$0,0')}
                  </div>
                </div>
              </div>
              
              <ShareButton 
                targetId="treasury-content"
                className="px-4 py-2.5 text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Page Title */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Asia's Bitcoin Treasury Companies
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto sm:mx-0">
            Tracking publicly disclosed Bitcoin holdings by Hong Kong-listed and China-headquartered companies
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 text-center">
            <p className="font-semibold text-base sm:text-lg mb-1">Error loading data</p>
            <p className="text-sm sm:text-base">Please refresh the page to try again.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64 sm:h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
              <p className="mt-6 text-lg sm:text-xl text-gray-700 font-medium">Loading treasury data...</p>
            </div>
          </div>
        )}

        {/* Data Section */}
        {data?.entities && data.entities.length > 0 && (
          <div className="space-y-8">
            {/* Table Section - Wrap in div with ID for screenshot */}
            <div id="treasury-content">
              <EnhancedTreasuryTable 
                data={data.entities} 
                btcPrice={btcPrice} 
              />
            </div>
            
            {/* Chart Section - Below table on all screens */}
            <div className="max-w-2xl mx-auto">
              <HoldingsChart data={data.entities} />
            </div>
            
            {/* Recent Filings Section */}
            <RecentFilings />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 sm:mt-20 pt-8 sm:pt-10 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
              Not investment advice. Data sourced from public filings and verified sources.
            </p>
            <div className="flex items-center justify-center space-x-6 sm:space-x-8">
              <a href="/api/v1/holdings" className="text-sm sm:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors">API</a>
              <a href="https://github.com/duke/hk-btc-treasuries" className="text-sm sm:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors">GitHub</a>
              <a href="https://twitter.com/YOUR_HANDLE" className="text-sm sm:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors">Twitter</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
