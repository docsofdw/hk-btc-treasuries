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
import { Info, ExternalLink, FileText, Search, Filter, X, TrendingUp, TrendingDown, Building2, Bitcoin, DollarSign, Calendar, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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

// Mobile Card Component
const MobileCard = ({ entity, btcPrice, rank }: { entity: TreasuryEntity; btcPrice: number; rank?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isHolder = entity.btc > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-200">
      {/* Card Header */}
      <div 
        className="p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2.5 mb-2">
              {rank && rank <= 3 && (
                <span className="text-2xl">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </span>
              )}
              <h3 className="font-bold text-gray-900 text-xl leading-tight">
                {entity.legalName}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
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
            </div>
          </div>
          <ChevronDown 
            className={`h-6 w-6 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Key Metrics */}
        {isHolder ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200/50">
              <div className="flex items-center gap-1.5 text-sm text-orange-600 mb-2 font-medium">
                <Bitcoin className="h-4 w-4" />
                <span>Holdings</span>
              </div>
              <div className="font-mono font-bold text-orange-700 text-lg">
                {numeral(entity.btc).format('0,0')} BTC
              </div>
              <div className="text-xs text-orange-600 mt-1">
                ₿ {numeral(entity.btc).format('0.00a')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
              <div className="flex items-center gap-1.5 text-sm text-green-600 mb-2 font-medium">
                <DollarSign className="h-4 w-4" />
                <span>USD Value</span>
              </div>
              <div className="font-bold text-green-700 text-lg">
                {numeral(entity.btc * btcPrice).format('$0.0a')}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {numeral(entity.btc * btcPrice).format('$0,0')}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200/50">
            <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-300 font-semibold px-3 py-1.5">
              🔍 Prospect Company
            </Badge>
            {entity.interestUrl && (
              <a
                href={entity.interestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-4 w-4" />
                <span>Info</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Headquarters</span>
            <span className="font-semibold text-gray-900">{entity.hq}</span>
          </div>
          
          {isHolder && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Last Disclosed</span>
                <span className="font-semibold text-gray-900">
                  {dayjs(entity.lastDisclosed).format('MMM DD, YYYY')}
                </span>
              </div>
              
              {entity.source && (
                <div className="pt-3">
                  <a
                    href={entity.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-white px-4 py-3 rounded-xl border border-blue-200 hover:border-blue-300 w-full justify-center transition-all hover:shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="h-5 w-5" />
                    <span>View Filing PDF</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </>
          )}

          <div className="pt-1">
            <a
              href={getOfficialExchangeUrl(entity.ticker, entity.listingVenue)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Building2 className="h-5 w-5" />
              <span>View on {entity.listingVenue}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          {/* Add HKEX Announcements link for Hong Kong companies */}
          {entity.listingVenue === 'HKEX' && (
            <div className="pt-1 mt-1 border-t border-gray-100">
              <a
                href={getHKEXAnnouncementsUrl(entity.ticker)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
                title={`View HKEX announcements${entity.ticker ? ` (Stock: ${entity.ticker.replace('.HK', '').padStart(5, '0')})` : ''}`}
              >
                HKEX News
              </a>
            </div>
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

type TabType = 'all' | 'holders' | 'prospects';

export default function EnhancedTreasuryTable({ data, btcPrice }: EnhancedTreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('holders');
  const [globalFilter, setGlobalFilter] = useState('');
  const isMobile = useIsMobile();

  // Separate data into holders and prospects
  const { holders, prospects } = useMemo(() => {
    const holders = data.filter(entity => entity.btc > 0);
    const prospects = data.filter(entity => entity.btc === 0);
    return { holders, prospects };
  }, [data]);

  // Get filtered data based on active tab
  const filteredData = useMemo(() => {
    switch (activeTab) {
      case 'holders':
        return holders;
      case 'prospects':
        return prospects;
      case 'all':
      default:
        return data;
    }
  }, [activeTab, holders, prospects, data]);

  // Reset sorting when tab changes
  useEffect(() => {
    // Immediately clear all sorting to prevent column ID conflicts
    setSorting([]);
    
    // Also clear the global filter to avoid conflicts
    setGlobalFilter('');
  }, [activeTab]);

  // Set default sorting after tab change is complete
  useEffect(() => {
    if (activeTab === 'holders' && sorting.length === 0) {
      setSorting([{ id: 'btc', desc: true }]);
    } else if (activeTab === 'prospects' && sorting.length === 0) {
      setSorting([{ id: 'prospectCompany', desc: false }]);
    } else if (activeTab === 'all' && sorting.length === 0) {
      setSorting([{ id: 'legalName', desc: false }]);
    }
  }, [activeTab, sorting.length]);

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

  // Column definitions for holders
  const holdersColumns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 50,
        enableSorting: false,
        cell: ({ getValue, row }) => {
          const rank = getValue() as number;
          return (
            <div className="text-center font-medium">
              <span className={`${
                rank === 1 ? 'text-yellow-600 font-bold' : 
                rank === 2 ? 'text-gray-600 font-bold' : 
                rank === 3 ? 'text-yellow-700 font-bold' : 'text-gray-500'
              }`}>
                #{rank}
              </span>
              {rank <= 3 && (
                <div className="text-lg leading-none">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'legalName',
        header: 'Company',
        accessorKey: 'legalName',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={getOfficialExchangeUrl(row.original.ticker, row.original.listingVenue)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {row.original.legalName}
              </a>
              <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                ✔ Disclosed
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono">{row.original.ticker}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                row.original.listingVenue === 'HKEX' ? 'bg-red-100 text-red-700' : 
                row.original.listingVenue === 'NASDAQ' ? 'bg-blue-100 text-blue-700' : 
                'bg-purple-100 text-purple-700'
              }`}>
                {row.original.listingVenue}
              </span>
              <span>•</span>
              <span>{row.original.hq}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'btc',
        header: 'Bitcoin Holdings',
        accessorKey: 'btc',
        cell: ({ getValue }) => (
          <div className="text-right min-w-[120px]">
            <div className="font-mono font-bold text-lg text-orange-600">
              {numeral(getValue() as number).format('0,0')} BTC
            </div>
            <div className="text-xs text-gray-500">
              ₿ {numeral(getValue() as number).format('0.00a')}
            </div>
          </div>
        ),
      },
      {
        header: 'USD Value',
        id: 'usdValue',
        accessorFn: (row) => row.btc * btcPrice,
        cell: ({ getValue }) => (
          <div className="text-right min-w-[120px]">
            <div className="font-medium text-green-600">
              {numeral(getValue() as number).format('$0,0')}
            </div>
            <div className="text-xs text-gray-500">
              {numeral(getValue() as number).format('$0.00a')}
            </div>
          </div>
        ),
      },
      {
        id: 'lastDisclosed', 
        header: 'Last Disclosed',
        accessorKey: 'lastDisclosed',
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-600">
            {dayjs(getValue() as string).format('MMM DD, YYYY')}
          </div>
        ),
      },
      {
        id: 'source',
        header: 'Source',
        accessorKey: 'source',
        cell: ({ getValue, row }) => {
          const sourceUrl = getValue() as string;
          return (
            <div className="text-center">
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  Filing PDF
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-gray-400 text-sm">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'announcements',
        header: 'Announcements',
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
                  title={`View HKEX announcements${ticker ? ` (Stock: ${ticker.replace('.HK', '').padStart(5, '0')})` : ''}`}
                >
                  HKEX News
                </a>
              </div>
            );
          }
          
          return (
            <div className="text-center">
              <span className="text-gray-400 text-sm">—</span>
            </div>
          );
        },
      },
    ],
    [btcPrice]
  );

  // Column definitions for prospects
  const prospectsColumns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        id: 'prospectRank',
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 50,
        enableSorting: false,
        cell: ({ getValue }) => (
          <div className="text-center font-medium text-gray-500">
            #{getValue() as number}
          </div>
        ),
      },
      {
        id: 'prospectCompany',
        header: 'Company',
        accessorKey: 'legalName',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={getOfficialExchangeUrl(row.original.ticker, row.original.listingVenue)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {row.original.legalName}
              </a>
              <Badge variant="outline" className="text-gray-600 bg-gray-50 border-gray-200">
                🔍 Prospect
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono">{row.original.ticker}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                row.original.listingVenue === 'HKEX' ? 'bg-red-100 text-red-700' : 
                row.original.listingVenue === 'NASDAQ' ? 'bg-blue-100 text-blue-700' : 
                'bg-purple-100 text-purple-700'
              }`}>
                {row.original.listingVenue}
              </span>
              <span>•</span>
              <span>{row.original.hq}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: () => (
          <div className="text-center">
            <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
              No Holdings
            </Badge>
          </div>
        ),
      },
      {
        id: 'interestLink',
        header: 'Interest Link',
        enableSorting: false,
        cell: ({ row }) => {
          const interestUrl = row.original.interestUrl;
          const sourceUrl = row.original.source;
          const linkUrl = interestUrl || sourceUrl;
          
          if (!linkUrl) {
            return <span className="text-gray-400 text-sm">—</span>;
          }

          // Determine link type and text
          let linkText = 'More Info';
          let icon = <Info className="h-4 w-4" />;
          
          if (linkUrl.includes('press') || linkUrl.includes('news')) {
            linkText = 'Press Release';
            icon = <FileText className="h-4 w-4" />;
          } else if (linkUrl.includes('blog') || linkUrl.includes('article')) {
            linkText = 'Article';
            icon = <FileText className="h-4 w-4" />;
          } else if (linkUrl.includes('investor') || linkUrl.includes('presentation')) {
            linkText = 'Investor Deck';
            icon = <FileText className="h-4 w-4" />;
          }

          return (
            <div className="text-center">
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
              >
                {icon}
                {linkText}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        },
      },
      {
        id: 'prospectAnnouncements',
        header: 'Announcements',
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
                  title={`View HKEX announcements${ticker ? ` (Stock: ${ticker.replace('.HK', '').padStart(5, '0')})` : ''}`}
                >
                  HKEX News
                </a>
              </div>
            );
          }
          
          return (
            <div className="text-center">
              <span className="text-gray-400 text-sm">—</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns: activeTab === 'prospects' ? prospectsColumns : holdersColumns,
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
        {/* Header with Summary Stats - Mobile Optimized */}
        <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 rounded-2xl p-5 sm:p-8 border border-orange-200/50 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-5 bg-white/80 rounded-xl backdrop-blur-sm border border-orange-100/50 shadow-sm">
              <div className="text-3xl sm:text-4xl font-bold text-orange-600 mb-1">
                {holders.length}
              </div>
              <div className="text-sm sm:text-base text-gray-700 font-medium">Active Bitcoin Holders</div>
            </div>
            <div className="text-center p-5 bg-white/80 rounded-xl backdrop-blur-sm border border-green-100/50 shadow-sm">
              <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-1">
                {numeral(holders.reduce((sum, h) => sum + h.btc, 0)).format('0,0')}
              </div>
              <div className="text-sm sm:text-base text-gray-700 font-medium">Total Bitcoin Holdings</div>
            </div>
            <div className="text-center p-5 bg-white/80 rounded-xl backdrop-blur-sm border border-blue-100/50 shadow-sm">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">
                {prospects.length}
              </div>
              <div className="text-sm sm:text-base text-gray-700 font-medium">Companies to Watch</div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isMobile && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="Search companies..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-base bg-white border-2 border-gray-200 rounded-2xl shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation - Mobile Optimized */}
        <div className="space-y-4">
          {/* Mobile Tabs - Horizontal Scroll */}
          {isMobile ? (
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="flex space-x-3 min-w-max pb-2">
                <button
                  onClick={() => setActiveTab('holders')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'holders' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200'
                  }`}
                >
                  <span className="mr-2">✔</span>
                  Active Holders
                  <span className="ml-2 opacity-75">({holders.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('prospects')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'prospects' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200'
                  }`}
                >
                  <span className="mr-2">🔍</span>
                  Prospects
                  <span className="ml-2 opacity-75">({prospects.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'all' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200'
                  }`}
                >
                  All Companies
                  <span className="ml-2 opacity-75">({data.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <Button
                  variant={activeTab === 'holders' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('holders')}
                  className={
                    activeTab === 'holders' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  ✔ Active Holders ({holders.length})
                </Button>
                <Button
                  variant={activeTab === 'prospects' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('prospects')}
                  className={
                    activeTab === 'prospects' 
                      ? 'bg-white text-gray-900 font-semibold shadow-sm hover:bg-gray-50 border border-gray-300 transition-all duration-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 transition-all duration-200'
                  }
                >
                  🔍 Prospects ({prospects.length})
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
                  All Companies ({data.length})
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

        {/* Mobile Cards / Desktop Table */}
        {isMobile ? (
          <div className="space-y-3">
            {table.getRowModel().rows.map((row, index) => (
              <MobileCard
                key={row.id}
                entity={row.original}
                btcPrice={btcPrice}
                rank={activeTab === 'holders' ? index + 1 : undefined}
              />
            ))}
            
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
        ) : (
          // Desktop Table View
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ width: header.getSize() }}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc' && <span>↑</span>}
                            {header.column.getIsSorted() === 'desc' && <span>↓</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        activeTab === 'holders' && index < 3 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getRowModel().rows.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-2">
                  {globalFilter ? 'No companies match your search' : 'No data available'}
                </div>
                {globalFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGlobalFilter('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Summary - Mobile Optimized */}
        {activeTab === 'holders' && holders.length > 0 && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-2xl p-5 sm:p-6 border border-gray-200/50 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <p className="text-gray-700 font-medium text-base">
                  Showing {holders.length} companies with confirmed Bitcoin holdings
                </p>
              </div>
              <div className="text-center sm:text-right">
                <div className="flex items-center gap-2 justify-center sm:justify-end">
                  <div className="flex items-center gap-1">
                    <Bitcoin className="h-5 w-5 text-orange-600" />
                    <span className="font-bold text-lg text-gray-900">
                      {numeral(holders.reduce((sum, h) => sum + h.btc, 0)).format('0,0')} BTC
                    </span>
                  </div>
                  <div className="text-green-600 font-semibold text-base">
                    ({numeral(holders.reduce((sum, h) => sum + h.btc, 0) * btcPrice).format('$0.0a')})
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 