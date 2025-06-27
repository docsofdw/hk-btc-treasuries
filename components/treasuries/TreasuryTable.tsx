'use client';

import { useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import dayjs from 'dayjs';
import numeral from 'numeral';
import { TreasuryEntity } from '@/types/treasury';
import { getOfficialExchangeUrl } from '@/lib/utils';

interface TreasuryTableProps {
  data: TreasuryEntity[];
  btcPrice?: number;
}

export default function TreasuryTable({ data, btcPrice = 107000 }: TreasuryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'btc', desc: true }
  ]);

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
            <a
              href={row.original.source}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:text-brand-light transition-colors block"
            >
              {row.original.legalName}
            </a>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">{row.original.ticker}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{row.original.hq}</span>
              {row.original.verified ? (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              ) : row.original.dataSource === 'filing' ? (
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  Filing
                </span>
              ) : (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  Sourced
                </span>
              )}
            </div>
          </div>
        ),
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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