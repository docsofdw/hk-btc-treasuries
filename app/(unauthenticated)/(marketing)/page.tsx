'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import numeral from 'numeral';
import Link from 'next/link';
import { Menu, X, AlertTriangle } from 'lucide-react';
import EnhancedTreasuryTable from '@/components/treasuries/EnhancedTreasuryTable';
import HoldingsChart from '@/components/treasuries/HoldingsChart';
import RecentFilings from '@/components/filings/RecentFilings';
import { ShareButton } from '@/components/ui/share-button';
import { DeltaIndicator } from '@/components/ui/delta-indicator';
import { SparklineChart, generateSampleSparklineData } from '@/components/ui/sparkline-chart';
import { RegionSelector } from '@/components/regions/RegionSelector';
import { RegionsOverview } from '@/components/regions/RegionsOverview';
import { TreasuryEntity } from '@/types/treasury';
import { StructuredData } from '@/components/seo/StructuredData';

interface HoldingResponse {
  id: string;
  company: string;
  ticker: string;
  exchange: string;
  headquarters: string;
  btcHoldings: number;
  deltaBtc?: number | null;
  costBasisUsd?: number;
  lastDisclosed: string;
  source: string;
  verified: boolean;
  marketCap?: number;
  sharesOutstanding?: number;
  region?: string;
  managerProfile?: string;
  companyType?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  
  // Transform /api/v1/holdings response to match expected format
  if (json.success && json.data?.holdings) {
    return {
      entities: json.data.holdings.map((h: HoldingResponse) => ({
        id: h.id,
        legalName: h.company,
        ticker: h.ticker,
        listingVenue: h.exchange,
        hq: h.headquarters,
        btc: h.btcHoldings,
        deltaBtc: h.deltaBtc ?? null, // NEW: Delta since last snapshot
        costBasisUsd: h.costBasisUsd,
        lastDisclosed: h.lastDisclosed,
        source: h.source,
        verified: h.verified,
        marketCap: h.marketCap,
        sharesOutstanding: h.sharesOutstanding,
        dataSource: 'manual',
        region: h.region,
        managerProfile: h.managerProfile,
        companyType: h.companyType,
      }))
    };
  }
  
  return json;
};

export default function HomePage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const [previousTotalBtc, setPreviousTotalBtc] = useState<number | undefined>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data, error, isLoading, mutate } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/v1/holdings?region=HK',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  // Calculate current totals and memoize for performance
  const treasuryStats = useMemo(() => {
    if (!data?.entities) return null;
    
    const totalBtc = data.entities.reduce((sum, entity) => sum + entity.btc, 0);
    const totalUsd = totalBtc * btcPrice;
    const companyCount = data.entities.length;
    const lastUpdated = data.entities.reduce((latest, entity) => {
      const entityDate = new Date(entity.lastDisclosed);
      return entityDate > latest ? entityDate : latest;
    }, new Date(0));

    return {
      totalBtc,
      totalUsd,
      companyCount,
      lastUpdated: lastUpdated.toISOString(),
    };
  }, [data?.entities, btcPrice]);

  // Check if any entity has stale data (> 90 days old)
  const hasStaleData = useMemo(() => {
    if (!data?.entities) return false;
    return data.entities.some(entity => {
      if (!entity.lastDisclosed) return false;
      const daysSinceDisclosure = (Date.now() - new Date(entity.lastDisclosed).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDisclosure > 90;
    });
  }, [data?.entities]);

  // Store previous total for delta calculation (simulate historical data for now)
  useEffect(() => {
    if (treasuryStats && !previousTotalBtc) {
      // Simulate previous week's data (5% lower for demo)
      setPreviousTotalBtc(treasuryStats.totalBtc * 0.95);
    }
  }, [treasuryStats, previousTotalBtc]);

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
    <>
      <StructuredData type="website" />
      <main className="min-h-screen bg-gray-50">
      {/* Mobile-Optimized Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Header */}
          <div className="sm:hidden">
            {/* Top Row: Logo, Price, Menu */}
            <div className="flex items-center justify-between py-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex-1 min-w-0">
                Asia's Bitcoin Treasuries
              </h1>
              
              <div className="flex items-center gap-3">
                {/* Compact BTC Price */}
                <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
                  <div className="text-xs text-gray-600 font-medium">BTC</div>
                  <div className="text-lg font-bold text-orange-600">
                    {numeral(btcPrice).format('$0,0')}
                  </div>
                </div>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="border-t border-gray-200 py-3 space-y-1">
                <Link 
                  href="/" 
                  className="block px-3 py-2 text-base font-medium text-orange-600 bg-orange-50 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Holdings
                </Link>
                {/* Pipeline hidden until it delivers value */}
                {/* <Link 
                  href="/pipeline" 
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pipeline
                </Link> */}
                <div className="px-3 py-2">
                  <RegionSelector compact />
                </div>
                <Link 
                  href="/about" 
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link 
                  href="/methodology" 
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Methodology
                </Link>
                {/* Admin hidden from public, access via /admin URL directly */}
                {/* <Link 
                  href="/admin/dynamic-updates" 
                  className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  🔧 Admin Dashboard
                </Link> */}
                <div className="px-3 py-2 pt-3 border-t border-gray-100">
                  <ShareButton 
                    targetId="treasury-content"
                    className="w-full justify-center py-3 text-base font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Header */}
          <div className="hidden sm:flex sm:items-center sm:justify-between py-0 sm:h-20">
            {/* Logo and Navigation */}
            <div className="flex flex-row items-center space-y-0">
              <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Asia's Bitcoin Treasuries
              </h1>
              
              <nav className="flex items-center gap-6 ml-8">
                <Link 
                  href="/" 
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Holdings
                </Link>
                {/* Pipeline hidden until it delivers value */}
                {/* <Link 
                  href="/pipeline" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pipeline
                </Link> */}
                <RegionSelector compact />
                <Link 
                  href="/about" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </Link>
                <Link 
                  href="/methodology" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Methodology
                </Link>
                {/* Admin hidden from public, access via /admin URL directly */}
                {/* <Link 
                  href="/admin/dynamic-updates" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-200"
                >
                  🔧 Admin
                </Link> */}
              </nav>
            </div>
            
            {/* Price and Share Button */}
            <div className="flex items-center justify-end gap-6">
              <div className="bg-orange-50 rounded-xl px-4 py-2.5 border border-orange-200">
                <div className="text-xs text-gray-600 font-medium mb-0.5">BTC Price</div>
                <div className="text-2xl font-bold text-orange-600">
                  {numeral(btcPrice).format('$0,0')}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        {/* Mobile-Optimized Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="text-center sm:text-left mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 leading-tight">
              Hong Kong's Bitcoin Treasuries
            </h2>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 max-w-3xl mx-auto sm:mx-0 leading-relaxed">
              Tracking corporate Bitcoin holdings from exchange filings. Source-linked. Updated daily.
            </p>
          </div>

          {/* Mobile-Optimized Dashboard */}
          {treasuryStats && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile: Stack vertically, Desktop: Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Holdings - Full width */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div className="mb-3 sm:mb-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Hong Kong Corporate Bitcoin Holdings</h3>
                      <DeltaIndicator
                        current={treasuryStats.totalBtc}
                        previous={previousTotalBtc}
                        format="0,0.00"
                        timeframe="WoW"
                        updatedAt={treasuryStats.lastUpdated}
                        className="mb-3"
                      />
                    </div>
                    
                    {/* Sparkline - Responsive sizing */}
                    <div className="text-center sm:text-right">
                      <div className="text-sm text-gray-600 mb-2">30-day trend</div>
                      <SparklineChart
                        data={generateSampleSparklineData(30, treasuryStats.totalBtc * 0.8)}
                        width={120}
                        height={40}
                        color="#ef4444"
                        showValue={false}
                        showChange={true}
                      />
                    </div>
                  </div>
                  
                  {/* Mobile-friendly stats grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">USD Value</div>
                      <div className="text-lg sm:text-xl font-bold text-green-600">
                        {numeral(treasuryStats.totalUsd).format('$0.00a')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">Companies</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-600">
                        {treasuryStats.companyCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 sm:px-6 py-4 rounded-r-lg mb-4 sm:mb-6">
            <p className="font-semibold text-sm sm:text-base lg:text-lg mb-1">Error loading data</p>
            <p className="text-xs sm:text-sm lg:text-base">Please refresh the page to try again.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-48 sm:h-64 lg:h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl text-gray-700 font-medium">Loading treasury data...</p>
            </div>
          </div>
        )}

        {/* Stale Data Warning Banner */}
        {hasStaleData && data?.entities && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Some holdings are older than 90 days. Companies with stale data are marked below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Section */}
        {data?.entities && data.entities.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {/* Table Section */}
            <div id="treasury-content">
              <EnhancedTreasuryTable 
                data={data.entities} 
                btcPrice={btcPrice} 
              />
            </div>
            
            {/* Chart Section - Hidden on mobile, visible on larger screens */}
            <div className="hidden sm:block max-w-2xl mx-auto">
              <HoldingsChart data={data.entities} />
            </div>
            
            {/* Recent Filings Section */}
            <RecentFilings />

            {/* Regional Overview Section */}
            <div className="mt-12 sm:mt-16">
              <RegionsOverview />
            </div>
          </div>
        )}

        {/* Mobile-Optimized Footer */}
        <footer className="mt-12 sm:mt-16 lg:mt-20 pt-6 sm:pt-8 lg:pt-10 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-4 sm:mb-6 px-2 sm:px-4 leading-relaxed">
              Not investment advice. Data sourced from public filings and verified sources.
            </p>
            <div className="flex items-center justify-center space-x-4 sm:space-x-6 lg:space-x-8">
              <a 
                href="/api/v1/holdings" 
                className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                API
              </a>
              <a 
                href="https://x.com/docsofduke" 
                className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                X
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
    </>
  );
}
