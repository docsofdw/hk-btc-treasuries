'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import numeral from 'numeral';
import { TreasuryEntity } from '@/types/treasury';
import { getOfficialExchangeUrl, getHKEXAnnouncementsUrl } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info, ExternalLink, FileText, Search, Filter, X, TrendingUp, TrendingDown, Building2, Bitcoin, DollarSign, Calendar, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import CountryExplorer from './CountryExplorer';

// Mini sparkline component
const MiniChart = ({ trend }: { trend: 'up' | 'down' | 'flat' }) => {
  const paths = {
    up: 'M 0 20 L 10 15 L 20 10 L 30 12 L 40 5',
    down: 'M 0 5 L 10 10 L 20 8 L 30 15 L 40 20',
    flat: 'M 0 12 L 40 12'
  };
  
  const colors = {
    up: '#10b981',
    down: '#ef4444',
    flat: '#6b7280'
  };
  
  return (
    <svg width="40" height="24" className="inline-block">
      <path
        d={paths[trend]}
        fill="none"
        stroke={colors[trend]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Mobile Card Component - Fully optimized for touch interfaces
const MobileCard = ({ entity, btcPrice, rank }: { entity: TreasuryEntity; btcPrice: number; rank?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isHolder = entity.btc > 0;
  const isChineseADR = (entity.listingVenue === 'NASDAQ' || entity.listingVenue === 'NYSE') && 
    (entity.hq?.toLowerCase().includes('china') ||
     entity.hq?.toLowerCase().includes('beijing') ||
     entity.hq?.toLowerCase().includes('shanghai') ||
     entity.hq?.toLowerCase().includes('shenzhen'));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-200 active:scale-[0.98]">
      {/* Card Header - Optimized for mobile touch */}
      <div 
        className="p-4 sm:p-5 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3 min-w-0">
            <div className="flex items-start gap-2 sm:gap-2.5 mb-3">
              {rank && rank <= 3 && (
                <span className="text-xl sm:text-2xl flex-shrink-0">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg sm:text-xl leading-tight mb-1 truncate">
                  {entity.listingVenue === 'HKEX' ? (
                    <a
                      href={`https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=${entity.ticker.replace('.HK', '').replace(/^0+/, '')}&sc_lang=en`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors active:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entity.legalName}
                    </a>
                  ) : (
                    entity.legalName
                  )}
                </h3>
                {isChineseADR && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold bg-orange-50 text-orange-700 border-orange-300 px-1.5 py-0.5"
                    >
                      ADR
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors" 
                          onClick={(e) => e.stopPropagation()}
                          aria-label="ADR information"
                        >
                          <Info className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs p-3 text-sm bg-white border border-gray-200 shadow-lg rounded-lg">
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">American Depositary Receipt (ADR)</div>
                          <div className="text-gray-700">
                            This Chinese company trades on US exchanges through ADRs - certificates representing shares of the foreign company.
                          </div>
                          <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                            <strong>ADR:</strong> US-traded certificate • <strong>Direct:</strong> Native exchange listing
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span className="font-mono bg-gray-100 px-2.5 py-1 rounded-md text-sm font-medium text-gray-700">
                {entity.ticker}
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold px-2.5 py-1 ${
                  entity.listingVenue === 'HKEX' 
                    ? 'bg-red-50 text-red-700 border-red-300' 
                    : entity.listingVenue === 'NASDAQ' 
                    ? 'bg-blue-50 text-blue-700 border-blue-300' 
                    : 'bg-purple-50 text-purple-700 border-purple-300'
                }`}
              >
                {entity.listingVenue}
              </Badge>
              <span className="text-xs text-gray-500 truncate">{entity.hq}</span>
            </div>
          </div>
          <button 
            className="h-10 w-10 rounded-lg flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Key Metrics - Mobile optimized */}
        {isHolder ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 sm:p-4 border border-orange-200/50">
              <div className="flex items-center gap-1.5 text-sm text-orange-600 mb-2 font-medium">
                <Bitcoin className="h-4 w-4" />
                <span>Holdings</span>
              </div>
              <div className="font-mono font-bold text-orange-700 text-lg sm:text-xl">
                {numeral(entity.btc).format('0,0')} BTC
              </div>
              <div className="text-xs text-orange-600 mt-1">
                ₿ {numeral(entity.btc).format('0.00a')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-3 sm:p-4 border border-green-200/50">
              <div className="flex items-center gap-1.5 text-sm text-green-600 mb-2 font-medium">
                <DollarSign className="h-4 w-4" />
                <span>USD Value</span>
              </div>
              <div className="font-bold text-green-700 text-lg sm:text-xl">
                {numeral(entity.btc * btcPrice).format('$0.0a')}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {numeral(entity.btc * btcPrice).format('$0,0')}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-3 sm:p-4 border border-gray-200/50 gap-3">
            <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-300 font-semibold px-3 py-1.5 text-sm">
              🔍 Prospect Company
            </Badge>
            {entity.interestUrl && (
              <a
                href={entity.interestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50 active:bg-blue-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-4 w-4" />
                <span className="text-sm">Info</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Expandable Details - Mobile optimized */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/50 space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600 font-medium text-sm">Headquarters</span>
            <span className="font-semibold text-gray-900 text-sm text-right">{entity.hq}</span>
          </div>
          
          {isHolder && (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 font-medium text-sm">Last Disclosed</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {dayjs(entity.lastDisclosed).format('MMM DD, YYYY')}
                </span>
              </div>
              
              {/* Action buttons - Mobile optimized */}
              <div className="pt-2 space-y-3">
                {entity.listingVenue === 'HKEX' && (
                  <>
                    <a
                      href={getHKEXAnnouncementsUrl(entity.ticker)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium bg-white px-4 py-3 rounded-xl border border-red-200 hover:border-red-300 w-full justify-center transition-all hover:shadow-sm active:scale-[0.98]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="h-5 w-5" />
                      <span>HKEX Filings</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    
                    <a
                      href={`https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=${entity.ticker.replace('.HK', '').replace(/^0+/, '')}&sc_lang=en`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl w-full justify-center transition-all duration-300 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl hover:bg-white/90 text-gray-700 hover:text-gray-900 font-medium active:scale-[0.98]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Building2 className="h-5 w-5" />
                      <span>View Stock Profile</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                )}
                
                {entity.listingVenue !== 'HKEX' && entity.source && (
                  <a
                    href={entity.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-white px-4 py-3 rounded-xl border border-blue-200 hover:border-blue-300 w-full justify-center transition-all hover:shadow-sm active:scale-[0.98]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="h-5 w-5" />
                    <span>Latest Bitcoin Filing</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface EnhancedTreasuryTableProps {
  data: TreasuryEntity[];
  btcPrice: number;
}

interface MarketData {
  ticker: string;
  marketCap?: number;
  price?: number;
  currency?: string;
}

type TabType = 'hong-kong' | 'thailand' | 'korea' | 'mainland-china' | 'all';

export default function EnhancedTreasuryTable({ data, btcPrice }: EnhancedTreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('hong-kong');
  const [globalFilter, setGlobalFilter] = useState('');
  const isMobile = useIsMobile();

  // Separate data by country/region - prioritize listing venue over headquarters
  const countryData = useMemo(() => {
    // Hong Kong: All HKEX listings (regardless of HQ location)
    const hongKong = data.filter(entity => 
      entity.listingVenue === 'HKEX'
    );
    
    // Mainland China: SSE/SZSE listings + Chinese ADRs on US exchanges
    const mainlandChina = data.filter(entity => 
      // Direct mainland China exchanges
      entity.listingVenue === 'SSE' ||
      entity.listingVenue === 'SZSE' ||
      // Chinese companies listed as ADRs on US exchanges (but not HKEX)
      ((entity.listingVenue === 'NASDAQ' || entity.listingVenue === 'NYSE') && 
       (entity.hq?.toLowerCase().includes('china') ||
        entity.hq?.toLowerCase().includes('beijing') ||
        entity.hq?.toLowerCase().includes('shanghai') ||
        entity.hq?.toLowerCase().includes('shenzhen'))) ||
      // Non-exchange listed companies with mainland China HQ (excluding Hong Kong)
      (entity.listingVenue !== 'HKEX' && 
       entity.listingVenue !== 'NASDAQ' && 
       entity.listingVenue !== 'NYSE' &&
       entity.hq?.toLowerCase().includes('china') && 
       !entity.hq?.toLowerCase().includes('hong kong'))
    );
    
    // Thailand: Companies with Thai headquarters (excluding those already categorized)
    const thailand = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      (entity.hq?.toLowerCase().includes('thailand') ||
       entity.hq?.toLowerCase().includes('bangkok'))
    );
    
    // Korea: Companies with Korean headquarters (excluding those already categorized)
    const korea = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      (entity.hq?.toLowerCase().includes('korea') ||
       entity.hq?.toLowerCase().includes('seoul') ||
       entity.hq?.toLowerCase().includes('south korea'))
    );

    // Singapore: Companies with Singapore headquarters
    const singapore = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      entity.hq?.toLowerCase().includes('singapore')
    );

    // India: Companies with Indian headquarters
    const india = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      (entity.hq?.toLowerCase().includes('india') ||
       entity.hq?.toLowerCase().includes('mumbai') ||
       entity.hq?.toLowerCase().includes('delhi') ||
       entity.hq?.toLowerCase().includes('bangalore'))
    );

    // Indonesia: Companies with Indonesian headquarters
    const indonesia = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      !india.includes(entity) &&
      (entity.hq?.toLowerCase().includes('indonesia') ||
       entity.hq?.toLowerCase().includes('jakarta'))
    );

    // Philippines: Companies with Philippine headquarters
    const philippines = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      !india.includes(entity) &&
      !indonesia.includes(entity) &&
      (entity.hq?.toLowerCase().includes('philippines') ||
       entity.hq?.toLowerCase().includes('manila'))
    );

    // Vietnam: Companies with Vietnamese headquarters
    const vietnam = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      !india.includes(entity) &&
      !indonesia.includes(entity) &&
      !philippines.includes(entity) &&
      (entity.hq?.toLowerCase().includes('vietnam') ||
       entity.hq?.toLowerCase().includes('ho chi minh'))
    );

    // Cambodia: Companies with Cambodian headquarters
    const cambodia = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      !india.includes(entity) &&
      !indonesia.includes(entity) &&
      !philippines.includes(entity) &&
      !vietnam.includes(entity) &&
      (entity.hq?.toLowerCase().includes('cambodia') ||
       entity.hq?.toLowerCase().includes('phnom penh'))
    );

    // Turkey: Companies with Turkish headquarters
    const turkey = data.filter(entity => 
      !hongKong.includes(entity) && 
      !mainlandChina.includes(entity) &&
      !thailand.includes(entity) &&
      !korea.includes(entity) &&
      !singapore.includes(entity) &&
      !india.includes(entity) &&
      !indonesia.includes(entity) &&
      !philippines.includes(entity) &&
      !vietnam.includes(entity) &&
      !cambodia.includes(entity) &&
      (entity.hq?.toLowerCase().includes('turkey') ||
       entity.hq?.toLowerCase().includes('istanbul') ||
       entity.hq?.toLowerCase().includes('ankara'))
    );

    return { 
      hongKong, 
      mainlandChina, 
      thailand, 
      korea, 
      singapore, 
      india, 
      indonesia, 
      philippines, 
      vietnam, 
      cambodia, 
      turkey 
    };
  }, [data]);

  // Separate holders and prospects for current country
  const { holders, prospects } = useMemo(() => {
    let currentCountryData: TreasuryEntity[] = [];
    
    switch (activeTab) {
      case 'hong-kong':
        currentCountryData = countryData.hongKong;
        break;
      case 'thailand':
        currentCountryData = countryData.thailand;
        break;
      case 'korea':
        currentCountryData = countryData.korea;
        break;
      case 'mainland-china':
        currentCountryData = countryData.mainlandChina;
        break;
      case 'all':
      default:
        currentCountryData = data;
        break;
    }
    
    const holders = currentCountryData.filter(entity => entity.btc > 0);
    const prospects = currentCountryData.filter(entity => entity.btc === 0);
    return { holders, prospects };
  }, [activeTab, countryData, data]);

  // Get filtered data based on active tab (show all companies from selected country by default)
  const filteredData = useMemo(() => {
    switch (activeTab) {
      case 'hong-kong':
        return countryData.hongKong;
      case 'thailand':
        return countryData.thailand;
      case 'korea':
        return countryData.korea;
      case 'mainland-china':
        return countryData.mainlandChina;
      case 'all':
      default:
        return data;
    }
  }, [activeTab, countryData, data]);

  // Reset sorting when tab changes
  useEffect(() => {
    // Immediately clear all sorting to prevent column ID conflicts
    setSorting([]);
    
    // Also clear the global filter to avoid conflicts
    setGlobalFilter('');
  }, [activeTab]);

  // Set default sorting after tab change is complete
  useEffect(() => {
    // Always sort by Bitcoin holdings descending, which puts holders first, then prospects
    setSorting([{ id: 'btc', desc: true }]);
  }, [activeTab]);

  // Fetch market cap data only for entities that don't have it in database
  useEffect(() => {
    const fetchMarketData = async () => {
      const entitiesWithoutMarketCap = data.filter(d => !d.marketCap);
      
      if (entitiesWithoutMarketCap.length === 0) return;
      
      setIsLoadingMarketData(true);
      
      try {
        const tickers = entitiesWithoutMarketCap.map(d => d.ticker).join(',');
        const venues = entitiesWithoutMarketCap.map(d => d.listingVenue).join(',');
        
        const response = await fetch(`/api/market-data?tickers=${tickers}&venues=${venues}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMarketData(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      } finally {
        setIsLoadingMarketData(false);
      }
    };
    
    fetchMarketData();
  }, [data]);

  // Column definitions for holders (simplified for desktop)
  const holdersColumns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        size: 60,
        enableSorting: false,
        cell: ({ row, table }) => {
          // Only show ranks for Bitcoin holders, calculate rank based on BTC holdings
          const entity = row.original;
          if (entity.btc === 0) {
            return (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-400 font-medium text-sm border border-gray-200">
                  —
                </div>
              </div>
            );
          }

          // Calculate rank among Bitcoin holders only
          const allData = table.getFilteredRowModel().rows.map(r => r.original);
          const holders = allData.filter(e => e.btc > 0).sort((a, b) => b.btc - a.btc);
          const rank = holders.findIndex(e => e.id === entity.id) + 1;

          return (
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30' : 
                rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/30' : 
                rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {rank}
              </div>
            </div>
          );
        },
      },
      {
        id: 'legalName',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-semibold hover:text-gray-700"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Company Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        accessorKey: 'legalName',
        cell: ({ row }) => {
          const isChineseADR = (row.original.listingVenue === 'NASDAQ' || row.original.listingVenue === 'NYSE') && 
            (row.original.hq?.toLowerCase().includes('china') ||
             row.original.hq?.toLowerCase().includes('beijing') ||
             row.original.hq?.toLowerCase().includes('shanghai') ||
             row.original.hq?.toLowerCase().includes('shenzhen'));

          return (
            <div className="py-1">
              <div className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
                {row.original.listingVenue === 'HKEX' ? (
                  <a
                    href={`https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=${row.original.ticker.replace('.HK', '').replace(/^0+/, '')}&sc_lang=en`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    {row.original.legalName}
                  </a>
                ) : (
                  row.original.legalName
                )}
                {isChineseADR && (
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold bg-orange-50 text-orange-700 border-orange-300 px-1.5 py-0.5"
                    >
                      ADR
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs p-3 text-sm bg-white border border-gray-200 shadow-lg rounded-lg">
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">American Depositary Receipt (ADR)</div>
                          <div className="text-gray-700">
                            This Chinese company trades on US exchanges through ADRs - certificates representing shares of the foreign company.
                          </div>
                          <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                            <strong>ADR:</strong> US-traded certificate • <strong>Direct:</strong> Native exchange listing
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                  {row.original.ticker}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium ${
                    row.original.listingVenue === 'HKEX' 
                      ? 'bg-red-50/50 text-red-700 border-red-200' 
                      : row.original.listingVenue === 'NASDAQ' 
                      ? 'bg-blue-50/50 text-blue-700 border-blue-200' 
                      : 'bg-purple-50/50 text-purple-700 border-purple-200'
                  }`}
                >
                  {row.original.listingVenue}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        id: 'btc',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-semibold hover:text-gray-700 w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Bitcoin Held
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        accessorKey: 'btc',
        cell: ({ getValue }) => (
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200/50">
              <Bitcoin className="h-5 w-5 text-orange-500" />
              <span className="font-mono font-bold text-lg text-gray-900">
                {numeral(getValue() as number).format('0,0')}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-semibold hover:text-gray-700 w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            USD Value
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        id: 'usdValue',
        accessorFn: (row) => row.btc * btcPrice,
        cell: ({ getValue }) => (
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-lg text-gray-900">
                {numeral(getValue() as number).format('$0.0a')}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'announcements',
        header: 'HKEX News',
        enableSorting: false,
        cell: ({ row }) => {
          const { ticker, listingVenue } = row.original;
          
          if (listingVenue === 'HKEX') {
            return (
              <div className="text-center">
                <a
                  href={getHKEXAnnouncementsUrl(ticker)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-all duration-200 border border-red-200/50 shadow-sm hover:shadow-md"
                >
                  <FileText className="h-4 w-4" />
                  <span>HKEX News</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          }
          
          return (
            <div className="text-center">
              <span className="text-gray-300">—</span>
            </div>
          );
        },
      },
    ],
    [btcPrice]
  );



  // Select columns based on active tab
  const currentColumns = useMemo(() => {
    // For all country tabs, use holders columns (they show both holders and prospects)
    return holdersColumns;
  }, [holdersColumns]);

  const table = useReactTable({
    data: filteredData,
    columns: currentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    enableSortingRemoval: true,
    manualSorting: false,
  });

  return (
    <TooltipProvider>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Simplified Hero Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Title and Total */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                {activeTab === 'all' 
                  ? 'Asian Bitcoin Treasury Explorer' 
                  : activeTab === 'hong-kong' 
                  ? 'Hong Kong Bitcoin Holdings'
                  : activeTab === 'mainland-china'
                  ? 'China Bitcoin Holdings'
                  : activeTab === 'thailand'
                  ? 'Thailand Bitcoin Holdings'
                  : activeTab === 'korea'
                  ? 'South Korea Bitcoin Holdings'
                  : 'Asian Bitcoin Corporate Holdings'
                }
              </h1>
              
              {/* Total Value */}
              <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-bold">
                <Bitcoin className="h-8 w-8 text-orange-500" />
                <span className="text-gray-900">{numeral(holders.reduce((sum, h) => sum + h.btc, 0)).format('0,0')}</span>
                <span className="text-gray-500 text-2xl font-normal">BTC</span>
              </div>
              
              <div className="mt-2 text-xl sm:text-2xl text-gray-600">
                ≈ {numeral(holders.reduce((sum, h) => sum + h.btc, 0) * btcPrice).format('$0.00a')} USD
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                @ {numeral(btcPrice).format('$0,0')} per BTC
              </div>
            </div>
            
            {/* Simple Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {activeTab === 'all' 
                    ? Object.values(countryData).reduce((sum, countries) => sum + countries.filter(c => c.btc > 0).length, 0)
                    : holders.length
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {activeTab === 'all' ? 'Global Holders' : 'Companies'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {((holders.reduce((sum, h) => sum + h.btc, 0) / 21000000) * 100).toFixed(3)}%
                </div>
                <div className="text-sm text-gray-600">of Supply</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {activeTab === 'all' 
                    ? Object.values(countryData).reduce((sum, countries) => sum + countries.filter(c => c.btc === 0).length, 0)
                    : prospects.length
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {activeTab === 'all' ? 'Global Prospects' : 'Prospects'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar - Enhanced for touch */}
        {isMobile && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="Search companies, tickers, or locations..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-base bg-white border-2 border-gray-200 rounded-2xl shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 touch-manipulation"
              style={{ 
                fontSize: '16px', // Prevent zoom on iOS
                WebkitAppearance: 'none', // Remove iOS styling
                borderRadius: '16px' // Consistent rounded corners
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 active:bg-gray-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation - Country Based */}
        <div className="space-y-4">
          {/* Mobile Tabs - Enhanced for touch with smooth scrolling */}
          {isMobile ? (
            <div 
              className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex space-x-3 min-w-max pb-2">
                <button
                  onClick={() => setActiveTab('hong-kong')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 touch-manipulation active:scale-95 ${
                    activeTab === 'hong-kong' 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 active:bg-gray-50'
                  }`}
                  aria-pressed={activeTab === 'hong-kong'}
                >
                  <span className="mr-2">🇭🇰</span>
                  Hong Kong
                  <span className="ml-2 opacity-75">({countryData.hongKong.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('thailand')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 touch-manipulation active:scale-95 ${
                    activeTab === 'thailand' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 active:bg-gray-50'
                  }`}
                  aria-pressed={activeTab === 'thailand'}
                >
                  <span className="mr-2">🇹🇭</span>
                  Thailand
                  <span className="ml-2 opacity-75">({countryData.thailand.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('korea')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 touch-manipulation active:scale-95 ${
                    activeTab === 'korea' 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 active:bg-gray-50'
                  }`}
                  aria-pressed={activeTab === 'korea'}
                >
                  <span className="mr-2">🇰🇷</span>
                  Korea
                  <span className="ml-2 opacity-75">({countryData.korea.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('mainland-china')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 touch-manipulation active:scale-95 ${
                    activeTab === 'mainland-china' 
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 active:bg-gray-50'
                  }`}
                  aria-pressed={activeTab === 'mainland-china'}
                >
                  <span className="mr-2">🇨🇳</span>
                  China
                  <span className="ml-2 opacity-75">({countryData.mainlandChina.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 touch-manipulation active:scale-95 ${
                    activeTab === 'all' 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 active:bg-gray-50'
                  }`}
                  aria-pressed={activeTab === 'all'}
                >
                  <span className="mr-2">🌏</span>
                  All Countries
                  <span className="ml-2 opacity-75">({Object.values(countryData).reduce((sum, countries) => sum + countries.length, 0)})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <Button
                  variant={activeTab === 'hong-kong' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('hong-kong')}
                  className={
                    activeTab === 'hong-kong' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🇭🇰 Hong Kong ({countryData.hongKong.length})
                </Button>
                <Button
                  variant={activeTab === 'thailand' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('thailand')}
                  className={
                    activeTab === 'thailand' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🇹🇭 Thailand ({countryData.thailand.length})
                </Button>
                <Button
                  variant={activeTab === 'korea' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('korea')}
                  className={
                    activeTab === 'korea' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🇰🇷 Korea ({countryData.korea.length})
                </Button>
                <Button
                  variant={activeTab === 'mainland-china' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('mainland-china')}
                  className={
                    activeTab === 'mainland-china' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🇨🇳 China ({countryData.mainlandChina.length})
                </Button>
                <Button
                  variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('all')}
                  className={
                    activeTab === 'all' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🌏 All Countries ({Object.values(countryData).reduce((sum, countries) => sum + countries.length, 0)})
                </Button>
              </div>

              {/* Desktop Search */}
              <div className="relative w-64">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  type="text"
                  placeholder="Search companies..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {globalFilter && (
                  <button
                    onClick={() => setGlobalFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cards / Desktop Table / Country Explorer */}
        {(() => {
          if (activeTab === 'all') {
            return (
              <CountryExplorer 
                countryData={countryData} 
                btcPrice={btcPrice}
              />
            );
          } else if (isMobile) {
            return (
          <div className="space-y-3">
            {table.getRowModel().rows.map((row) => {
              // Calculate rank for Bitcoin holders only
              const entity = row.original;
              let rank: number | undefined = undefined;
              
              if (entity.btc > 0) {
                const allData = table.getFilteredRowModel().rows.map(r => r.original);
                const holders = allData.filter(e => e.btc > 0).sort((a, b) => b.btc - a.btc);
                rank = holders.findIndex(e => e.id === entity.id) + 1;
              }

              return (
                <MobileCard
                  key={row.id}
                  entity={entity}
                  btcPrice={btcPrice}
                  rank={rank}
                />
              );
            })}
            
            {table.getRowModel().rows.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                <div className="max-w-sm mx-auto px-6">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {globalFilter ? 'No matches found' : 'No data available'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {globalFilter 
                      ? `We couldn't find any companies matching "${globalFilter}"`
                      : 'There are no companies to display at the moment.'
                    }
                  </p>
                  {globalFilter && (
                    <button
                      onClick={() => setGlobalFilter('')}
                      className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
            );
          } else {
            return (
          // Desktop Table View - Simplified
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            style={{ width: header.getSize() }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {table.getRowModel().rows.map((row) => {
                      // Calculate if this is a top 3 Bitcoin holder
                      const entity = row.original;
                      let isTop3 = false;
                      
                      if (entity.btc > 0) {
                        const allData = table.getFilteredRowModel().rows.map(r => r.original);
                        const holders = allData.filter(e => e.btc > 0).sort((a, b) => b.btc - a.btc);
                        const rank = holders.findIndex(e => e.id === entity.id) + 1;
                        isTop3 = rank <= 3;
                      }

                      return (
                        <tr
                          key={row.id}
                          className={`group hover:bg-white/80 transition-all duration-200 ${
                            isTop3 ? 'bg-gradient-to-r from-yellow-50/30 to-orange-50/30' : ''
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-6 py-5 whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {table.getRowModel().rows.length === 0 && (
                <div className="text-center py-16 bg-white/50 backdrop-blur-sm">
                  <div className="text-gray-400 text-6xl mb-4">∅</div>
                  <div className="text-gray-600 font-medium text-lg mb-2">
                    {globalFilter ? 'No companies match your search' : 'No data available'}
                  </div>
                  {globalFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGlobalFilter('')}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
            );
          }
        })()}
      </div>
    </TooltipProvider>
  );
} 