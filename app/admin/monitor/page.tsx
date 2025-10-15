'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SummaryStats {
  total_entities?: number;
  entities_with_holdings?: number;
  total_btc?: number;
  verified_filings?: number;
}

interface Entity {
  id: string;
  legal_name: string;
  btc: number;
  listing_venue: string;
  last_disclosed: string;
  ticker?: string;
  manager_profile?: 'ACTIVE_MANAGER' | 'PASSIVE_HOLDER' | null;
  company_type?: 'INTERNET' | 'GAMING' | 'MINER' | 'TECH' | 'INVESTMENT' | 'OTHER' | null;
}

interface MonitorStats {
  summary: SummaryStats | null;
  entities: Entity[] | null;
}

export default function MonitorPage() {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      // Get summary stats from data_quality_report
      const { data: summaryData, error: summaryError } = await supabase
        .from('data_quality_report')
        .select('*')
        .single();
      
      if (summaryError) {
        console.warn('Could not load data_quality_report:', summaryError.message);
      }
      
      // Get entity breakdown from latest_snapshot
      const { data: entities, error: entitiesError } = await supabase
        .from('latest_snapshot')
        .select('*')
        .gt('btc', 0)
        .order('btc', { ascending: false })
        .limit(20);
      
      if (entitiesError) {
        console.error('Error loading entities:', entitiesError);
        setError('Failed to load entities data');
        return;
      }
      
      // Calculate summary stats if data_quality_report is not available
      let summary = summaryData;
      if (!summary && entities) {
        summary = {
          total_entities: entities.length,
          entities_with_holdings: entities.filter(e => e.btc > 0).length,
          total_btc: entities.reduce((sum, e) => sum + (e.btc || 0), 0),
          verified_filings: null
        };
      }
      
      setStats({ summary, entities });
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    await loadStats();
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-96 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error Loading Data</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={refreshData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of Bitcoin treasury holdings
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
      
      {stats && (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Entities</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.summary?.total_entities || stats.entities?.length || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Companies tracked</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">With Holdings</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.summary?.entities_with_holdings || 
                 stats.entities?.filter(e => e.btc > 0).length || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Have Bitcoin</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Bitcoin</div>
              <div className="text-3xl font-bold text-orange-500">
                {(stats.summary?.total_btc || 
                  stats.entities?.reduce((sum, e) => sum + (e.btc || 0), 0) || 0
                ).toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">BTC Holdings</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Verified Filings</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.summary?.verified_filings || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Recent filings</div>
            </div>
          </div>
          
          {/* Top Holdings Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Top Bitcoin Holdings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Companies ranked by Bitcoin holdings (showing top 20)
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bitcoin Holdings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Update
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.entities?.map((entity, index) => (
                    <tr key={entity.id} className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            index === 0 ? 'text-yellow-600' : 
                            index === 1 ? 'text-gray-500' : 
                            index === 2 ? 'text-yellow-700' : 'text-gray-900'
                          }`}>
                            #{index + 1}
                          </span>
                          {index < 3 && (
                            <span className="ml-2 text-lg">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entity.legal_name}
                        </div>
                        {entity.ticker && (
                          <div className="text-sm text-gray-500">{entity.ticker}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {entity.btc.toLocaleString(undefined, { 
                            minimumFractionDigits: 0, 
                            maximumFractionDigits: 2 
                          })} BTC
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entity.listing_venue === 'HKEX' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entity.listing_venue || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entity.last_disclosed ? 
                          new Date(entity.last_disclosed).toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {(!stats.entities || stats.entities.length === 0) && (
              <div className="text-center py-12">
                <div className="text-gray-500">No holdings data available</div>
                <button 
                  onClick={refreshData}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Try refreshing the data
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 