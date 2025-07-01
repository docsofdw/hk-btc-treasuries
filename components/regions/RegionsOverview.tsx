'use client';

import Link from 'next/link';
import { Calendar, TrendingUp, Globe, Building, ArrowRight } from 'lucide-react';
import { REGIONS_ARRAY, ACTIVE_REGIONS, UPCOMING_REGIONS, getRegionStats } from '@/types/regions';
import numeral from 'numeral';

interface RegionsOverviewProps {
  className?: string;
}

export function RegionsOverview({ className = '' }: RegionsOverviewProps) {
  const stats = getRegionStats();

  const getRegulatoryStatusColor = (status: string) => {
    switch (status) {
      case 'friendly': return 'text-green-600 bg-green-50 border-green-200';
      case 'neutral': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'developing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'restrictive': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAdoptionIcon = (adoption: string) => {
    switch (adoption) {
      case 'active': return '🟢';
      case 'emerging': return '🟡';
      case 'early': return '🟠';
      case 'none': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Overview Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Asia-Pacific Bitcoin Treasury Landscape</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {stats.totalRegions}
            </div>
            <div className="text-sm text-gray-600">Total Regions</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {stats.activeRegions}
            </div>
            <div className="text-sm text-gray-600">Active Markets</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {stats.upcomingRegions}
            </div>
            <div className="text-sm text-gray-600">Coming Soon</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              ${numeral(stats.totalGDP / 1000).format('0.0')}T
            </div>
            <div className="text-sm text-gray-600">Combined GDP</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-800 mb-1">
                Market Expansion Strategy
              </div>
              <div className="text-xs text-blue-700">
                We're systematically expanding across Asia-Pacific's largest economies, starting with crypto-friendly 
                jurisdictions and building comprehensive corporate Bitcoin adoption tracking for each market.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Regions */}
      {ACTIVE_REGIONS.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-green-600">🟢</span>
            Active Markets
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {ACTIVE_REGIONS.map((region) => (
              <Link
                key={region.id}
                href={`/${region.slug}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{region.flag}</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {region.name}
                        </h4>
                        <div className="text-sm text-gray-600">{region.primaryExchange}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">{region.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">GDP</div>
                        <div className="font-medium">${numeral(region.gdp).format('0.0a')}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Market Cap</div>
                        <div className="font-medium">${numeral(region.marketCap).format('0.0a')}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Regulatory Status</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRegulatoryStatusColor(region.regulatoryStatus)}`}>
                          {region.regulatoryStatus}
                        </span>
                      </div>
                      <div>
                        <div className="text-gray-600">BTC Adoption</div>
                        <div className="flex items-center gap-1">
                          <span>{getAdoptionIcon(region.corporateAdoption)}</span>
                          <span className="font-medium capitalize">{region.corporateAdoption}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Regions */}
      {UPCOMING_REGIONS.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-yellow-600">🟡</span>
            Coming Soon
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {UPCOMING_REGIONS.map((region) => (
              <Link
                key={region.id}
                href={`/${region.slug}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                {/* Coming Soon Overlay */}
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full border border-yellow-200">
                    Coming Soon
                  </span>
                </div>
                
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{region.flag}</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {region.name}
                    </h4>
                    <div className="text-sm text-gray-600">{region.primaryExchange}</div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-4">{region.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-gray-600">Economy Size</div>
                    <div className="font-medium">${numeral(region.gdp).format('0.0a')} GDP</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Stock Market</div>
                    <div className="font-medium">${numeral(region.marketCap).format('0.0a')} cap</div>
                  </div>
                  <div>
                    <div className="text-gray-600">BTC Legal Status</div>
                    <div className="font-medium capitalize">{region.btcLegalStatus}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Population</div>
                    <div className="font-medium">{numeral(region.population).format('0.0a')}M</div>
                  </div>
                </div>

                {region.launchDate && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Expected launch: {new Date(region.launchDate).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Regional Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Regional Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Regulatory Leadership</h4>
            <p className="text-sm text-gray-700">
              Hong Kong and Singapore lead with crypto-friendly regulations, making them natural starting points 
              for corporate Bitcoin adoption in Asia.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Market Opportunity</h4>
            <p className="text-sm text-gray-700">
              Combined ${numeral(stats.totalMarketCap / 1000).format('0.0')}T market cap across {stats.totalRegions} major 
              economies represents massive potential for corporate treasury diversification.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Expansion Timeline</h4>
            <p className="text-sm text-gray-700">
              We're rolling out region-by-region based on regulatory clarity, market size, and corporate 
              Bitcoin adoption readiness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}