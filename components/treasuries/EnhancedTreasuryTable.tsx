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
import { getOfficialExchangeUrl } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

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

export default function EnhancedTreasuryTable({ data, btcPrice }: EnhancedTreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'btc', desc: true }]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);

  // Fetch market cap data only for entities that don't have it in database
  useEffect(() => {
    const fetchMarketData = async () => {
      // Filter entities that don't have market cap in database
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

  const columns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 40,
        cell: ({ getValue }) => (
          <div className="text-center font-medium text-gray-500">
            {getValue() as number}
          </div>
        ),
      },
      {
        header: 'Name',
        accessorKey: 'legalName',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <a
              href={getOfficialExchangeUrl(row.original.ticker, row.original.listingVenue)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 hover:text-orange-600 transition-colors block"
            >
              {row.original.legalName}
            </a>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{row.original.hq}</span>
              {row.original.source && (
                <>
                  <span>•</span>
                  <a 
                    href={row.original.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-orange-600 transition-colors"
                  >
                    Source →
                  </a>
                </>
              )}
            </div>
          </div>
        ),
      },
      {
        header: 'Ticker',
        accessorKey: 'ticker',
        cell: ({ getValue, row }) => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="font-mono text-sm font-medium">{getValue() as string}</span>
            <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap
              ${row.original.listingVenue === 'HKEX' ? 'bg-red-100 text-red-700' : 
                row.original.listingVenue === 'NASDAQ' ? 'bg-blue-100 text-blue-700' : 
                row.original.listingVenue === 'NYSE' ? 'bg-purple-100 text-purple-700' : 
                'bg-gray-100 text-gray-700'}`}>
              {row.original.listingVenue}
            </span>
          </div>
        ),
      },
      {
        header: 'Bitcoin ↓',
        accessorKey: 'btc',
        cell: ({ getValue }) => (
          <div className="text-right min-w-[100px]">
            <div className="font-mono font-medium">
              {numeral(getValue() as number).format('0,0')}
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
            <div className="font-medium">
              {numeral(getValue() as number).format('$0,0')}
            </div>
            <div className="text-xs text-gray-500">
              {numeral(getValue() as number).format('$0.00a')}
            </div>
          </div>
        ),
      },
      {
        header: 'Market Cap',
        accessorKey: 'marketCap',
        cell: ({ row }) => {
          const ticker = row.original.ticker;
          const apiData = marketData[ticker];
          
          // Priority 1: Use market cap from database
          if (row.original.marketCap) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-right text-sm min-w-[80px] cursor-help flex items-center justify-end gap-1">
                      {numeral(row.original.marketCap).format('$0.0a')}
                      <Info className="h-3 w-3 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Market cap from database</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          // Priority 2: Show loading if we're fetching from API
          if (isLoadingMarketData && !row.original.marketCap) {
            return (
              <div className="text-right text-sm min-w-[80px]">
                <span className="inline-block animate-pulse bg-gray-200 rounded w-12 h-4"></span>
              </div>
            );
          }
          
          // Priority 3: Use market cap from API if available
          if (apiData?.marketCap) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-right text-sm min-w-[80px] cursor-help flex items-center justify-end gap-1">
                      {numeral(apiData.marketCap).format('$0.0a')}
                      <Info className="h-3 w-3 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Live market data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          // Priority 4: Show unavailable
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-right text-sm min-w-[80px] text-gray-400 cursor-help">
                    —
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Market cap data unavailable</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        header: 'BTC/Sh',
        id: 'btcPerShare',
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono min-w-[80px]">
            {row.original.btc && row.original.sharesOutstanding 
              ? (row.original.btc / row.original.sharesOutstanding).toFixed(4)
              : '—'}
          </div>
        ),
      },
    ],
    [btcPrice, marketData, isLoadingMarketData]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalBtc = data.reduce((sum, entity) => sum + entity.btc, 0);
    const totalValue = totalBtc * btcPrice;
    const avgHolding = totalBtc / data.length;
    const percentOfSupply = (totalBtc / 21000000) * 100;
    
    return { totalBtc, totalValue, avgHolding, percentOfSupply };
  }, [data, btcPrice]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
          <div className="text-xs sm:text-sm opacity-90">Total BTC</div>
          <div className="text-lg sm:text-2xl font-bold">{numeral(stats.totalBtc).format('0,0')}</div>
          <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">
            {stats.percentOfSupply.toFixed(3)}% of supply
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
          <div className="text-xs sm:text-sm opacity-90">Total Value</div>
          <div className="text-lg sm:text-2xl font-bold">{numeral(stats.totalValue).format('$0.0a')}</div>
          <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">
            @ {numeral(btcPrice).format('$0,0')}/BTC
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
          <div className="text-xs sm:text-sm opacity-90">Companies</div>
          <div className="text-lg sm:text-2xl font-bold">{data.length}</div>
          <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">
            Avg: {numeral(stats.avgHolding).format('0,0')} BTC
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
          <div className="text-xs sm:text-sm opacity-90">Verified</div>
          <div className="text-lg sm:text-2xl font-bold">{data.filter(d => d.verified).length}</div>
          <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">
            From official filings
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() && (
                          <span className="text-orange-500">
                            {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.map((row, index) => (
                <tr 
                  key={row.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    index < 3 ? 'bg-orange-50/30' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 sm:px-4 py-2.5 sm:py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile scroll indicator */}
        <div className="lg:hidden px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">← Swipe to see more →</p>
        </div>
      </div>
    </div>
  );
} 