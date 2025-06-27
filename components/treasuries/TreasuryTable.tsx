'use client';

import { useMemo, useState, useCallback } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface TreasuryTableProps {
  data: TreasuryEntity[];
  btcPrice?: number;
}

// Helper function to determine listing type
function getListingType(ticker: string, exchange: string): { label: string; className: string } {
  if (ticker.endsWith('.HK')) {
    return { label: 'HKEX', className: 'bg-emerald-600/10 text-emerald-700' };
  } else if (exchange === 'NASDAQ' || exchange === 'NYSE') {
    return { label: 'ADR', className: 'bg-indigo-600/10 text-indigo-700' };
  } else if (exchange === 'SZSE') {
    return { label: 'SZSE', className: 'bg-orange-600/10 text-orange-700' };
  }
  return { label: 'Other', className: 'bg-gray-600/10 text-gray-700' };
}

export default function TreasuryTable({ data, btcPrice = 107000 }: TreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'btc', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedFilter = useDebounce(globalFilter, 300);

  const columns = useMemo<ColumnDef<TreasuryEntity>[]>(
    () => [
      {
        header: '#',
        accessorFn: (_row, i) => i + 1,
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-gray-500 font-medium">{row.index + 1}</span>
        ),
      },
      {
        header: 'Company',
        accessorKey: 'legalName',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <a
                href={getOfficialExchangeUrl(row.original.ticker, row.original.listingVenue)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:text-brand-light transition-colors"
                title={`View ${row.original.legalName} on ${row.original.listingVenue}`}
              >
                {row.original.legalName}
              </a>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-900 text-white">
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-400">Primary listing:</span> {row.original.listingVenue}
                      {row.original.ticker.endsWith('.HK') ? ' (HKEX)' : ' (ADR)'}
                    </div>
                    <div>
                      <span className="text-gray-400">Headquarters:</span> {row.original.hq}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{row.original.ticker}</span>
              <span className="text-gray-400">•</span>
              <span>{row.original.hq}</span>
            </div>
          </div>
        ),
      },
      {
        header: 'Listing',
        id: 'listingType',
        size: 80,
        enableSorting: false,
        cell: ({ row }) => {
          const { label, className } = getListingType(row.original.ticker, row.original.listingVenue);
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
              {label}
            </span>
          );
        },
      },
      {
        header: 'Ticker',
        accessorKey: 'ticker',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue() as string}</span>
        ),
      },
      {
        header: 'Exchange',
        accessorKey: 'listingVenue',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">{getValue() as string}</span>
        ),
      },
      {
        header: 'Location',
        accessorKey: 'hq',
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue() as string}</span>
        ),
      },
      {
        header: 'BTC Holdings',
        accessorKey: 'btc',
        cell: ({ getValue }) => (
          <div className="font-medium">
            {numeral(getValue() as number).format('0,0.0000')}
          </div>
        ),
      },
      {
        header: 'USD Value',
        id: 'usdValue',
        accessorFn: (row) => row.btc * btcPrice,
        cell: ({ getValue }) => (
          <span className="font-medium">
            {numeral(getValue() as number).format('$0,0')}
          </span>
        ),
      },
      {
        header: 'Cost Basis',
        accessorKey: 'costBasisUsd',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return value ? numeral(value).format('$0,0') : '—';
        },
      },
      {
        header: 'Gain',
        id: 'gain',
        accessorFn: (row) => {
          if (!row.costBasisUsd) return null;
          return (row.btc * btcPrice) / row.costBasisUsd;
        },
        cell: ({ getValue }) => {
          const gain = getValue() as number | null;
          if (!gain) return '—';
          const isProfit = gain >= 1;
          return (
            <span
              className={`font-medium ${
                isProfit ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {gain.toFixed(2)}x
            </span>
          );
        },
      },
      {
        header: 'Filing',
        id: 'filing',
        size: 120,
        cell: ({ row }) => {
          if (row.original.verified) {
            return (
              <a
                href={row.original.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                title="View verified filing"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </a>
            );
          } else if (row.original.dataSource === 'filing') {
            return (
              <a
                href={row.original.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors"
                title="View filing (pending verification)"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending
              </a>
            );
          } else if (row.original.dataSource === 'export') {
            return (
              <a
                href={row.original.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                title="Data from BTCTreasuries.net"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Auto
              </a>
            );
          } else if (row.original.source) {
            return (
              <a
                href={row.original.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                title="View source"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Source
              </a>
            );
          }
          return <span className="text-gray-400 text-xs">—</span>;
        },
      },
      {
        header: 'Last Updated',
        accessorKey: 'lastDisclosed',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">
            {dayjs(getValue() as string).format('MMM D, YYYY')}
          </span>
        ),
      },
    ],
    [btcPrice]
  );

  const table = useReactTable({
    data,
    columns,
    state: { 
      sorting,
      globalFilter: debouncedFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const totals = useMemo(() => {
    const totalBtc = data.reduce((sum, entity) => sum + entity.btc, 0);
    const totalUsd = totalBtc * btcPrice;
    const totalCost = data.reduce((sum, entity) => sum + (entity.costBasisUsd || 0), 0);
    return { totalBtc, totalUsd, totalCost };
  }, [data, btcPrice]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Companies</div>
          <div className="text-2xl font-bold text-brand">{data.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total BTC</div>
          <div className="text-2xl font-bold text-brand">
            {numeral(totals.totalBtc).format('0,0.00')}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-brand">
            {numeral(totals.totalUsd).format('$0.00a')}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">BTC Price</div>
          <div className="text-2xl font-bold text-orange-600">
            {numeral(btcPrice).format('$0,0')}
          </div>
        </div>
      </div>

      {/* Search and Table Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search companies, tickers, or locations..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
        <div className="text-sm text-gray-500">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} companies
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {header.column.getIsSorted() && (
                          <span>{header.column.getIsSorted() === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-4">
        <p>
          * Data sourced from public filings and BitcoinTreasuries.net
          {' · '}
          <span className="text-green-600 font-medium">
            {data.filter(d => d.verified).length} verified from official filings
          </span>
          {' · '}
          <span className="text-blue-600">
            {data.filter(d => d.dataSource === 'filing' && !d.verified).length} pending verification
          </span>
        </p>
      </div>
    </div>
  );
} 