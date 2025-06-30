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
import ProspectsView from './ProspectsView';

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
                {entity.listingVenue === 'HKEX' ? (
                  <a
                    href={`https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=${entity.ticker.replace('.HK', '').replace(/^0+/, '')}&sc_lang=en`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entity.legalName}
                  </a>
                ) : (
                  entity.legalName
                )}
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
                    <span>Latest Bitcoin Filing</span>
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
    } else if (activeTab === 'all' && sorting.length === 0) {
      setSorting([{ id: 'legalName', desc: false }]);
    }
    // No sorting needed for prospects tab since it uses a custom view
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

  // Column definitions for holders (simplified for desktop)
  const holdersColumns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 60,
        enableSorting: false,
        cell: ({ getValue }) => {
          const rank = getValue() as number;
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
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-semibold text-gray-900 text-base mb-1">
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
        ),
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

  // Column definitions for prospects (simplified for desktop)
  const prospectsColumns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        id: 'prospectRank',
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 60,
        enableSorting: false,
        cell: ({ getValue }) => (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">
              {getValue() as number}
            </div>
          </div>
        ),
      },
      {
        id: 'prospectCompany',
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
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-semibold text-gray-900 text-base mb-1">
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
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: () => (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50">
              <Search className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-gray-900">Prospect</span>
            </div>
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
            return <div className="text-center"><span className="text-gray-300">—</span></div>;
          }

          return (
            <div className="text-center">
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-all duration-200 border border-blue-200/50 shadow-sm hover:shadow-md"
              >
                <Info className="h-4 w-4" />
                <span>More Info</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        },
      },
      {
        id: 'prospectAnnouncements',
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
    []
  );

  // Select columns based on active tab
  const currentColumns = useMemo(() => {
    if (activeTab === 'prospects') {
      return prospectsColumns;
    } else if (activeTab === 'holders') {
      return holdersColumns;
    } else {
      // For 'all' tab, use holders columns
      return holdersColumns;
    }
  }, [activeTab, holdersColumns, prospectsColumns]);

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
                Asia's Bitcoin Treasury
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
                <div className="text-2xl font-bold text-gray-900">{holders.length}</div>
                <div className="text-sm text-gray-600">Companies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {((holders.reduce((sum, h) => sum + h.btc, 0) / 21000000) * 100).toFixed(3)}%
                </div>
                <div className="text-sm text-gray-600">of Supply</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{prospects.length}</div>
                <div className="text-sm text-gray-600">Prospects</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isMobile && activeTab !== 'prospects' && (
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
              {activeTab !== 'prospects' && (
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
              )}
            </div>
          )}
        </div>

        {/* Mobile Cards / Desktop Table / Prospects View */}
        {(() => {
          if (activeTab === 'prospects') {
            return <ProspectsView btcPrice={btcPrice} prospects={prospects} />;
          } else if (isMobile) {
            return (
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
                    {table.getRowModel().rows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`group hover:bg-white/80 transition-all duration-200 ${
                          activeTab === 'holders' && index < 3 
                            ? 'bg-gradient-to-r from-yellow-50/30 to-orange-50/30' 
                            : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-5 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
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