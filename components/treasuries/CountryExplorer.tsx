'use client';

import { useState } from 'react';
import { ChevronDown, Bitcoin, DollarSign, ExternalLink, FileText, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getHKEXAnnouncementsUrl } from '@/lib/utils';
import numeral from 'numeral';
import { TreasuryEntity } from '@/types/treasury';

interface CountryData {
  hongKong: TreasuryEntity[];
  mainlandChina: TreasuryEntity[];
  thailand: TreasuryEntity[];
  korea: TreasuryEntity[];
  singapore: TreasuryEntity[];
  india: TreasuryEntity[];
  indonesia: TreasuryEntity[];
  philippines: TreasuryEntity[];
  vietnam: TreasuryEntity[];
  cambodia: TreasuryEntity[];
  turkey: TreasuryEntity[];
}

interface CountryExplorerProps {
  countryData: CountryData;
  btcPrice: number;
}

interface CountryInfo {
  key: keyof CountryData;
  name: string;
  flag: string;
  gradient: string;
  bgColor: string;
  textColor: string;
}

const countries: CountryInfo[] = [
  {
    key: 'hongKong',
    name: 'Hong Kong',
    flag: '🇭🇰',
    gradient: 'from-red-500/20 via-red-400/10 to-transparent',
    bgColor: 'bg-red-50/30',
    textColor: 'text-red-700'
  },
  {
    key: 'mainlandChina',
    name: 'China',
    flag: '🇨🇳',
    gradient: 'from-yellow-500/20 via-yellow-400/10 to-transparent',
    bgColor: 'bg-yellow-50/30',
    textColor: 'text-yellow-700'
  },
  {
    key: 'singapore',
    name: 'Singapore',
    flag: '🇸🇬',
    gradient: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
    bgColor: 'bg-emerald-50/30',
    textColor: 'text-emerald-700'
  },
  {
    key: 'korea',
    name: 'South Korea',
    flag: '🇰🇷',
    gradient: 'from-blue-500/20 via-blue-400/10 to-transparent',
    bgColor: 'bg-blue-50/30',
    textColor: 'text-blue-700'
  },
  {
    key: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    gradient: 'from-purple-500/20 via-purple-400/10 to-transparent',
    bgColor: 'bg-purple-50/30',
    textColor: 'text-purple-700'
  },
  {
    key: 'india',
    name: 'India',
    flag: '🇮🇳',
    gradient: 'from-orange-500/20 via-orange-400/10 to-transparent',
    bgColor: 'bg-orange-50/30',
    textColor: 'text-orange-700'
  },
  {
    key: 'vietnam',
    name: 'Vietnam',
    flag: '🇻🇳',
    gradient: 'from-green-500/20 via-green-400/10 to-transparent',
    bgColor: 'bg-green-50/30',
    textColor: 'text-green-700'
  },
  {
    key: 'indonesia',
    name: 'Indonesia',
    flag: '🇮🇩',
    gradient: 'from-rose-500/20 via-rose-400/10 to-transparent',
    bgColor: 'bg-rose-50/30',
    textColor: 'text-rose-700'
  },
  {
    key: 'philippines',
    name: 'Philippines',
    flag: '🇵🇭',
    gradient: 'from-indigo-500/20 via-indigo-400/10 to-transparent',
    bgColor: 'bg-indigo-50/30',
    textColor: 'text-indigo-700'
  },
  {
    key: 'turkey',
    name: 'Turkey',
    flag: '🇹🇷',
    gradient: 'from-cyan-500/20 via-cyan-400/10 to-transparent',
    bgColor: 'bg-cyan-50/30',
    textColor: 'text-cyan-700'
  },
  {
    key: 'cambodia',
    name: 'Cambodia',
    flag: '🇰🇭',
    gradient: 'from-pink-500/20 via-pink-400/10 to-transparent',
    bgColor: 'bg-pink-50/30',
    textColor: 'text-pink-700'
  }
];

const CompanyCard = ({ entity, rank, btcPrice }: { entity: TreasuryEntity; rank?: number; btcPrice: number }) => {
  const isHolder = entity.btc > 0;
  const isChineseADR = (entity.listingVenue === 'NASDAQ' || entity.listingVenue === 'NYSE') && 
    (entity.hq?.toLowerCase().includes('china') ||
     entity.hq?.toLowerCase().includes('beijing') ||
     entity.hq?.toLowerCase().includes('shanghai') ||
     entity.hq?.toLowerCase().includes('shenzhen'));

  return (
    <div className="group relative bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-4 hover:bg-white/60 hover:border-white/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {rank && (
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg' :
              rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg' :
              rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg' :
              'bg-gray-100 text-gray-600'
            }`}>
              {rank}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {entity.listingVenue === 'HKEX' ? (
                  <a
                    href={`https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=${entity.ticker.replace('.HK', '').replace(/^0+/, '')}&sc_lang=en`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    {entity.legalName}
                  </a>
                ) : (
                  entity.legalName
                )}
              </h4>
              {isChineseADR && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Badge className="text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-300 px-1 py-0">
                          ADR
                        </Badge>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                      <div className="font-semibold mb-1">American Depositary Receipt</div>
                      <div className="text-xs text-gray-600">US-traded certificate representing foreign shares</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-900 text-white">
                {entity.ticker}
              </span>
              <Badge 
                className={`text-xs border ${
                  entity.listingVenue === 'HKEX' ? 'bg-red-50/50 text-red-700 border-red-200' :
                  entity.listingVenue === 'NASDAQ' ? 'bg-blue-50/50 text-blue-700 border-blue-200' :
                  'bg-purple-50/50 text-purple-700 border-purple-200'
                }`}
              >
                {entity.listingVenue}
              </Badge>
            </div>

            {isHolder ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-orange-50/50 rounded-lg p-2 border border-orange-100">
                  <div className="flex items-center gap-1 text-xs text-orange-600 mb-1">
                    <Bitcoin className="h-3 w-3" />
                    <span>Bitcoin</span>
                  </div>
                  <div className="font-mono font-bold text-orange-700 text-sm">
                    {numeral(entity.btc).format('0,0')}
                  </div>
                </div>
                <div className="bg-green-50/50 rounded-lg p-2 border border-green-100">
                  <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Value</span>
                  </div>
                  <div className="font-bold text-green-700 text-sm">
                    {numeral(entity.btc * btcPrice).format('$0.0a')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/50 rounded-lg p-2 border border-amber-100">
                <div className="text-amber-700 font-medium text-xs">🔍 Prospect Company</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {entity.listingVenue === 'HKEX' && (
        <div className="mt-3 pt-3 border-t border-white/30">
          <a
            href={getHKEXAnnouncementsUrl(entity.ticker)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            <FileText className="h-3 w-3" />
            <span>HKEX News</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}
    </div>
  );
};

export default function CountryExplorer({ countryData, btcPrice }: CountryExplorerProps) {
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  const toggleCountry = (countryKey: string) => {
    const newExpanded = new Set(expandedCountries);
    if (newExpanded.has(countryKey)) {
      newExpanded.delete(countryKey);
    } else {
      newExpanded.add(countryKey);
    }
    setExpandedCountries(newExpanded);
  };

  const getCountryStats = (companies: TreasuryEntity[]) => {
    const holders = companies.filter(c => c.btc > 0);
    const totalBtc = holders.reduce((sum, c) => sum + c.btc, 0);
    return {
      total: companies.length,
      holders: holders.length,
      prospects: companies.length - holders.length,
      totalBtc
    };
  };

  return (
    <TooltipProvider>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">
            Asian Bitcoin Treasury Explorer
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover Bitcoin holdings across Asian markets and beyond. Click any country to explore detailed company rankings.
          </p>
        </div>

        {/* Country Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {countries.map((country) => {
             const companies = countryData[country.key];
             const stats = getCountryStats(companies);
             const isExpanded = expandedCountries.has(country.key);

             return (
              <div key={country.key} className="group">
                {/* Country Card */}
                                   <button
                   onClick={() => toggleCountry(country.key)}
                   className={`w-full p-6 rounded-xl border backdrop-blur-sm transition-all duration-500 hover:scale-[1.01] ${
                     isExpanded 
                       ? `bg-gradient-to-br ${country.gradient} border-white/50` 
                       : stats.total === 0
                       ? 'bg-gray-50/40 border-gray-200/50 hover:bg-gray-100/60 hover:border-gray-300/50'
                       : 'bg-white/40 border-white/30 hover:bg-white/60 hover:border-white/50'
                   }`}
                 >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{country.flag}</span>
                                             <div className="text-left">
                         <h3 className="font-bold text-gray-900 text-lg">{country.name}</h3>
                         <p className="text-sm text-gray-600">
                           {stats.total === 0 ? 'Available market' : `${stats.total} companies`}
                         </p>
                       </div>
                    </div>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>

                                     <div className="grid grid-cols-2 gap-3 text-left">
                     <div className={`${stats.total === 0 ? 'bg-gray-100/50' : country.bgColor} rounded-lg p-3 border border-white/50`}>
                       <div className={`text-2xl font-bold ${stats.total === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                         {stats.holders}
                       </div>
                       <div className="text-xs text-gray-600">Holders</div>
                     </div>
                     <div className={`${stats.total === 0 ? 'bg-gray-100/50' : country.bgColor} rounded-lg p-3 border border-white/50`}>
                       <div className={`text-2xl font-bold ${stats.total === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                         {stats.totalBtc > 0 ? numeral(stats.totalBtc).format('0.0a') : '0'}
                       </div>
                       <div className="text-xs text-gray-600">BTC</div>
                     </div>
                   </div>
                </button>

                {/* Expanded Country Leaderboard */}
                {isExpanded && (
                  <div className="mt-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 p-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 text-xl">{country.name} Leaderboard</h4>
                        <p className="text-sm text-gray-600">
                          {stats.holders} Bitcoin holders • {stats.prospects} prospects
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {companies
                        .sort((a, b) => b.btc - a.btc)
                        .map((company, index) => {
                          const rank = company.btc > 0 ? 
                            companies.filter(c => c.btc > 0).sort((a, b) => b.btc - a.btc).findIndex(c => c.id === company.id) + 1 
                            : undefined;
                          
                          return (
                            <CompanyCard
                              key={company.id}
                              entity={company}
                              rank={rank}
                              btcPrice={btcPrice}
                            />
                          );
                        })}
                    </div>

                                         {companies.length === 0 && (
                       <div className="text-center py-8 text-gray-500">
                         <div className="text-4xl mb-2">🏢</div>
                         <p>No companies found in {country.name}</p>
                         <p className="text-sm text-gray-400 mt-1">This market is available for future data</p>
                       </div>
                     )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

                 {/* Empty State - Only show if there's literally no data */}
         {Object.values(countryData).every(companies => companies.length === 0) && (
           <div className="text-center py-16 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30">
             <div className="text-6xl mb-4">🌏</div>
             <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
             <p className="text-gray-600">No companies found across any regions</p>
           </div>
         )}
      </div>
    </TooltipProvider>
  );
} 