'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe, TrendingUp, Building, Calendar, ExternalLink } from 'lucide-react';
import { Region, getRegionStats } from '@/types/regions';
import { TreasuryEntity } from '@/types/treasury';
import { DeltaIndicator } from '@/components/ui/delta-indicator';
import { ContextPanel } from '@/components/ui/context-panel';
import EnhancedTreasuryTable from '@/components/treasuries/EnhancedTreasuryTable';
import { PipelineFunnel } from '@/components/pipeline/PipelineFunnel';
import numeral from 'numeral';

interface RegionalPageProps {
  region: Region;
  entities: TreasuryEntity[];
  btcPrice: number;
  isLoading?: boolean;
  error?: string;
}

export function RegionalPage({ region, entities, btcPrice, isLoading, error }: RegionalPageProps) {
  const regionalStats = useMemo(() => {
    const totalBtc = entities.reduce((sum, entity) => sum + entity.btc, 0);
    const totalUsd = totalBtc * btcPrice;
    const companyCount = entities.length;
    const lastUpdated = entities.reduce((latest, entity) => {
      const entityDate = new Date(entity.lastDisclosed);
      return entityDate > latest ? entityDate : latest;
    }, new Date(0));

    return {
      totalBtc,
      totalUsd,
      companyCount,
      lastUpdated: companyCount > 0 ? lastUpdated.toISOString() : null,
    };
  }, [entities, btcPrice]);

  const marketPenetration = useMemo(() => {
    if (regionalStats.companyCount === 0) return 0;
    // Estimate market penetration based on region market cap
    // Assume ~2000 public companies per $1T market cap
    const estimatedPublicCompanies = Math.round((region.marketCap / 1000) * 2000);
    return (regionalStats.companyCount / estimatedPublicCompanies) * 100;
  }, [regionalStats.companyCount, region.marketCap]);

  const getRegulatoryStatusColor = (status: string) => {
    switch (status) {
      case 'friendly': return 'text-green-600 bg-green-50 border-green-200';
      case 'neutral': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'developing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'restrictive': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAdoptionColor = (adoption: string) => {
    switch (adoption) {
      case 'active': return 'text-green-600';
      case 'emerging': return 'text-blue-600';
      case 'early': return 'text-yellow-600';
      case 'none': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to All Regions</span>
              </Link>
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-3xl">{region.flag}</span>
                {region.name} Bitcoin Treasuries
              </h1>
              <p className="text-sm text-gray-600 mt-1">{region.description}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-600">Region Status</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRegulatoryStatusColor(region.regulatoryStatus)}`}>
                  {region.isActive ? '🟢 Active' : '🟡 Coming Soon'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Region Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Market Overview */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Market Overview</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">GDP</div>
                <div className="text-xl font-bold text-gray-900">
                  ${numeral(region.gdp).format('0.0a')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Market Cap</div>
                <div className="text-xl font-bold text-gray-900">
                  ${numeral(region.marketCap).format('0.0a')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Population</div>
                <div className="text-xl font-bold text-gray-900">
                  {numeral(region.population).format('0.0a')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Exchange</div>
                <div className="text-lg font-bold text-blue-600">
                  {region.primaryExchange}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-700">{region.marketDescription}</p>
            </div>
          </div>

          {/* Regulatory Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Regulatory Environment</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Bitcoin Legal Status</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${region.btcLegalStatus === 'legal' ? 'text-green-600 bg-green-50 border-green-200' : region.btcLegalStatus === 'banned' ? 'text-red-600 bg-red-50 border-red-200' : 'text-yellow-600 bg-yellow-50 border-yellow-200'}`}>
                  {region.btcLegalStatus.charAt(0).toUpperCase() + region.btcLegalStatus.slice(1)}
                </span>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Corporate Adoption</div>
                <div className={`text-sm font-medium ${getAdoptionColor(region.corporateAdoption)}`}>
                  {region.corporateAdoption.charAt(0).toUpperCase() + region.corporateAdoption.slice(1)}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Regulator</div>
                <div className="text-sm text-gray-900">{region.regulatoryBody}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin Holdings Data */}
        {region.isActive ? (
          <>
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 text-center">
                <p className="font-semibold text-lg mb-1">Error loading {region.name} data</p>
                <p>Please refresh the page to try again.</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
                  <p className="mt-6 text-xl text-gray-700 font-medium">Loading {region.name} treasury data...</p>
                </div>
              </div>
            )}

            {/* Data Content */}
            {!isLoading && !error && (
              <div className="space-y-8">
                {entities.length > 0 ? (
                  <>
                    {/* Holdings Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {region.name} Bitcoin Holdings
                        </h3>
                        
                        <DeltaIndicator
                          current={regionalStats.totalBtc}
                          format="0,0.00"
                          updatedAt={regionalStats.lastUpdated || undefined}
                          className="mb-4"
                        />

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                          <div>
                            <div className="text-sm text-gray-600">USD Value</div>
                            <div className="text-xl font-bold text-green-600">
                              {numeral(regionalStats.totalUsd).format('$0.00a')}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Companies</div>
                            <div className="text-xl font-bold text-blue-600">
                              {regionalStats.companyCount}
                            </div>
                          </div>
                        </div>

                        {marketPenetration > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="text-sm text-gray-600">Market Penetration</div>
                            <div className="text-lg font-bold text-orange-600">
                              {numeral(marketPenetration / 100).format('0.00%')}
                            </div>
                            <div className="text-xs text-gray-500">of estimated public companies</div>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-1">
                        <ContextPanel
                          asiaTotalBtc={regionalStats.totalBtc}
                          asiaCompanyCount={regionalStats.companyCount}
                          className="h-full"
                        />
                      </div>
                    </div>

                    {/* Treasury Table */}
                    <EnhancedTreasuryTable 
                      data={entities} 
                      btcPrice={btcPrice}
                    />

                    {/* Pipeline if applicable */}
                    <PipelineFunnel entities={entities} showEstimates={true} />
                  </>
                ) : (
                  // No data yet - this will be the empty state
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">{region.flag}</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      No Bitcoin Holdings Data Yet
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      We're actively monitoring {region.name}-listed companies for Bitcoin treasury adoption. 
                      Be the first to know when companies start reporting holdings.
                    </p>
                    
                    <div className="bg-blue-50 rounded-lg p-4 max-w-lg mx-auto">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            Market Opportunity
                          </div>
                          <div className="text-xs text-blue-700">
                            {region.name} has a ${numeral(region.marketCap).format('0.0a')} stock market 
                            with {region.regulatoryStatus === 'friendly' ? 'crypto-friendly' : 'developing'} regulations. 
                            Corporate Bitcoin adoption could follow global trends.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Coming Soon State
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{region.flag}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {region.name} - Coming Soon
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              We're preparing comprehensive Bitcoin treasury tracking for {region.name}. 
              This region will launch with full pipeline monitoring and regulatory insights.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <Globe className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Market Monitoring</h4>
                <p className="text-sm text-gray-600">
                  Track {region.primaryExchange}-listed companies and their Bitcoin strategies
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <Building className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Regulatory Insights</h4>
                <p className="text-sm text-gray-600">
                  Updates from {region.regulatoryBody} on corporate crypto policies
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Pipeline Tracking</h4>
                <p className="text-sm text-gray-600">
                  Monitor companies from initial interest to verified holdings
                </p>
              </div>
            </div>

            {region.launchDate && (
              <div className="bg-orange-50 rounded-lg p-4 max-w-md mx-auto border border-orange-200">
                <div className="flex items-center justify-center gap-2 text-orange-800">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Expected launch: {new Date(region.launchDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              {region.name} Bitcoin treasury data sourced from {region.primaryExchange} filings and verified sources.
              <br />
              Regulatory information from {region.regulatoryBody}.
            </p>
            <div className="flex items-center justify-center space-x-6">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                All Regions
              </Link>
              <Link href="/pipeline" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Global Pipeline
              </Link>
              <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}