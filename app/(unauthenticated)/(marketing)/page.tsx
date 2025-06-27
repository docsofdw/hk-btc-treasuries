'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import numeral from 'numeral';
import EnhancedTreasuryTable from '@/components/treasuries/EnhancedTreasuryTable';
import HoldingsChart from '@/components/treasuries/HoldingsChart';
import RecentFilings from '@/components/filings/RecentFilings';
import EmbedModal from '@/components/ui/EmbedModal';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'hongkong' | 'global'>('hongkong');
  
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                Bitcoin Treasuries
              </h1>
              
              <nav className="hidden lg:flex items-center gap-6 ml-8">
                <button
                  onClick={() => setActiveTab('hongkong')}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === 'hongkong' 
                      ? 'text-orange-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hong Kong & China
                </button>
                <button
                  onClick={() => setActiveTab('global')}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === 'global' 
                      ? 'text-orange-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Global Markets
                </button>
                <a 
                  href="/about" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </a>
              </nav>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-500 hidden sm:block">BTC Price</div>
                <div className="text-base sm:text-lg font-semibold text-orange-600">
                  {numeral(btcPrice).format('$0,0')}
                </div>
              </div>
              
              <button
                onClick={() => setShowEmbedModal(true)}
                className="px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Embed
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('hongkong')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'hongkong' 
                ? 'text-orange-600' 
                : 'text-gray-600'
            }`}
          >
            Hong Kong & China
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'global' 
                ? 'text-orange-600' 
                : 'text-gray-600'
            }`}
          >
            Global Markets
          </button>
          <a 
            href="/about" 
            className="text-sm font-medium text-gray-600 whitespace-nowrap"
          >
            About
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {activeTab === 'hongkong' ? 'Hong Kong & China' : 'Global'} Bitcoin Treasury Companies
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Tracking publicly disclosed Bitcoin holdings by {activeTab === 'hongkong' ? 'Hong Kong-listed and China-headquartered' : 'global'} companies
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading treasury data...</p>
            </div>
          </div>
        )}

        {/* Data Section */}
        {data?.entities && data.entities.length > 0 && (
          <div className="space-y-8">
            {/* Table Section */}
            <div>
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
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              Not investment advice. Data sourced from public filings and verified sources.
            </p>
            <div className="flex items-center justify-center space-x-4 sm:space-x-6 mt-4">
              <a href="/api/v1/holdings" className="hover:text-gray-700">API</a>
              <a href="https://github.com/duke/hk-btc-treasuries" className="hover:text-gray-700">GitHub</a>
              <a href="https://twitter.com/YOUR_HANDLE" className="hover:text-gray-700">Twitter</a>
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
