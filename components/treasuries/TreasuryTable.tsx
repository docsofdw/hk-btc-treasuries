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
      },
      {
        header: 'Company',
        accessorKey: 'legalName',
        cell: ({ row }) => (
          <div>
            <a
              href={row.original.source}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:text-brand-light transition-colors"
            >
              {row.original.legalName}
            </a>
            {row.original.dataSource === 'filing' && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Verified
              </span>
            )}
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
          <span className="font-medium">
            {numeral(getValue() as number).format('0,0.0000')}
          </span>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <thead className="bg-brand-dark">
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
      <div className="text-center text-sm text-gray-500">
        <p>
          * Data sourced from public filings and BitcoinTreasuries.net
          {' · '}
          <span className="text-orange-600">
            {data.filter(d => d.dataSource === 'filing').length} verified from filings
          </span>
        </p>
      </div>
    </div>
  );
} 