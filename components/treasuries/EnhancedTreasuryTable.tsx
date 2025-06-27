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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink, FileText, Search, Filter } from 'lucide-react';

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

type TabType = 'all' | 'holders' | 'prospects';

export default function EnhancedTreasuryTable({ data, btcPrice }: EnhancedTreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('holders');
  const [globalFilter, setGlobalFilter] = useState('');

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
    if (activeTab === 'holders') {
      // Sort holders by Bitcoin holdings (descending)
      setSorting([{ id: 'btc', desc: true }]);
    } else if (activeTab === 'prospects') {
      // Sort prospects by company name
      setSorting([{ id: 'prospectCompany', desc: false }]);
    } else {
      // Sort all by Bitcoin holdings (descending)
      setSorting([{ id: 'btc', desc: true }]);
    }
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
  });

  return (
    <TooltipProvider>
      <div className="w-full space-y-6">
        {/* Header with Summary Stats */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 border border-orange-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {holders.length}
              </div>
              <div className="text-sm text-gray-600">Active Bitcoin Holders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {numeral(holders.reduce((sum, h) => sum + h.btc, 0)).format('0,0')}
              </div>
              <div className="text-sm text-gray-600">Total Bitcoin Holdings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {prospects.length}
              </div>
              <div className="text-sm text-gray-600">Companies to Watch</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'holders' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('holders')}
              className={activeTab === 'holders' ? 'bg-white shadow-sm' : ''}
            >
              ✔ Active Holders ({holders.length})
            </Button>
            <Button
              variant={activeTab === 'prospects' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('prospects')}
              className={activeTab === 'prospects' ? 'bg-white shadow-sm' : ''}
            >
              🔍 Prospects ({prospects.length})
            </Button>
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className={activeTab === 'all' ? 'bg-white shadow-sm' : ''}
            >
              All Companies ({data.length})
            </Button>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search companies..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Table */}
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

        {/* Footer Summary */}
        {activeTab === 'holders' && holders.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
              <div>
                Showing {holders.length} companies with confirmed Bitcoin holdings
              </div>
              <div className="font-medium">
                Total: {numeral(holders.reduce((sum, h) => sum + h.btc, 0)).format('0,0')} BTC 
                ({numeral(holders.reduce((sum, h) => sum + h.btc, 0) * btcPrice).format('$0.0a')})
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 