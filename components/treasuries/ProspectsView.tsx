'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Building2, DollarSign, Globe, FileText, Info, Briefcase, Bitcoin, TrendingUp, MapPin, Calendar, Target, AlertCircle } from 'lucide-react';
import numeral from 'numeral';
import { TreasuryEntity } from '@/types/treasury';
import { getOfficialExchangeUrl, getHKEXAnnouncementsUrl } from '@/lib/utils';

interface ProspectsViewProps {
  btcPrice: number;
  prospects: TreasuryEntity[];
}

// Contextual information for prospect companies
const prospectContext: Record<string, {
  description: string;
  significance: string;
  category: 'hk-digital-assets' | 'mainland-mining' | 'other';
  status: 'strong-potential' | 'monitoring' | 'uncertain';
  filingUrl?: string;
  website?: string;
  notes?: string;
}> = {
  '0863.HK': {
    description: "HK$ 655.7m (≈ US$84m) of \"digital assets\" on 31 Dec 2024 balance‑sheet; BTC split not broken out",
    significance: "SFC‑licensed exchange & custodian; uses BTC for market‑making, inventory and M&A consideration.",
    category: 'hk-digital-assets',
    status: 'strong-potential',
    filingUrl: "https://www1.hkexnews.hk"
  },
  '1611.HK': {
    description: "Manufactures electronics but, via New Huo brand, runs OTC and custody desks; filings state \"digital‑asset inventories\" but no BTC figure.",
    significance: "Diversified technology company expanding into digital asset services through strategic partnerships.",
    category: 'hk-digital-assets',
    status: 'monitoring',
    filingUrl: "https://reuters.com"
  },
  '1499.HK': {
    description: "Operates OKLink analytics & planned Web3 wallet; board minutes (Feb‑25) approved \"framework to deploy part of treasury into BTC/ETH\" – execution still pending.",
    significance: "Board-approved Bitcoin treasury strategy shows strong institutional commitment to crypto adoption.",
    category: 'hk-digital-assets',
    status: 'strong-potential',
    website: "https://okg.com.hk"
  },
  'BTCM': {
    description: "Discloses BTC produced each month (≈6‑7 BTC self‑mined in Mar‑25) but no treasury figure published",
    significance: "Bitcoin mining operations with regular production disclosures but unclear treasury accumulation strategy.",
    category: 'mainland-mining',
    status: 'monitoring',
    filingUrl: "https://prnewswire.com",
    notes: "Monthly production disclosed but no end-of-period treasury figures"
  },
  'EBON': {
    description: "No current BTC balance reported; company focuses on hardware sales and has warned of \"liquidity constraints\"",
    significance: "Former miner now focused on hardware sales with potential for future Bitcoin treasury adoption.",
    category: 'mainland-mining',
    status: 'uncertain',
    filingUrl: "https://finance.yahoo.com",
    notes: "Company warned of liquidity constraints; Bitcoin adoption uncertain"
  },
  '1415.HK': {
    description: "Diversified technology and investment company based in Hong Kong",
    significance: "Technology investment focus could lead to digital asset treasury adoption.",
    category: 'other',
    status: 'monitoring'
  }
};

export default function ProspectsView({ btcPrice, prospects }: ProspectsViewProps) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // Categorize prospects by type
  const { hkDigitalAssets, mainlandMining, others } = useMemo(() => {
    const hkDigitalAssets = prospects.filter(p => prospectContext[p.ticker]?.category === 'hk-digital-assets');
    const mainlandMining = prospects.filter(p => prospectContext[p.ticker]?.category === 'mainland-mining');
    const others = prospects.filter(p => !prospectContext[p.ticker] || prospectContext[p.ticker]?.category === 'other');
    return { hkDigitalAssets, mainlandMining, others };
  }, [prospects]);

  const renderProspectCard = (entity: TreasuryEntity) => {
    const context = prospectContext[entity.ticker];
    const isExpanded = expandedCompany === entity.ticker;
    
    // Status-based styling
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'strong-potential': return 'border-green-200 bg-gradient-to-br from-white to-green-50/30';
        case 'monitoring': return 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30';
        case 'uncertain': return 'border-yellow-200 bg-gradient-to-br from-white to-yellow-50/30';
        default: return 'border-gray-200 bg-gradient-to-br from-white to-gray-50/30';
      }
    };

    const getStatusBadge = (status?: string) => {
      switch (status) {
        case 'strong-potential': return { text: 'Strong Potential', color: 'bg-green-50 text-green-700 border-green-300' };
        case 'monitoring': return { text: 'Monitoring', color: 'bg-blue-50 text-blue-700 border-blue-300' };
        case 'uncertain': return { text: 'Uncertain', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' };
        default: return { text: 'Under Review', color: 'bg-gray-50 text-gray-700 border-gray-300' };
      }
    };

    const statusBadge = getStatusBadge(context?.status);

    return (
      <Card key={entity.ticker} className={`p-6 hover:shadow-lg transition-all duration-300 border-2 ${getStatusColor(context?.status)}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">{entity.legalName}</h3>
                <Badge variant="outline" className={`${
                  entity.listingVenue === 'HKEX' ? 'bg-red-50 text-red-700 border-red-300' :
                  entity.listingVenue === 'NASDAQ' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                  'bg-purple-50 text-purple-700 border-purple-300'
                } font-semibold`}>
                  {entity.listingVenue}
                </Badge>
                <Badge variant="outline" className={`${statusBadge.color} font-semibold`}>
                  {statusBadge.text}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{entity.ticker}</code>
                <MapPin className="h-4 w-4" />
                <span>{entity.hq}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedCompany(isExpanded ? null : entity.ticker)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>

          {/* Context Information */}
          {context && (
            <>
              {/* Description */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-700">Current Position</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{context.description}</p>
              </div>

              {/* Significance */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-700">Bitcoin Adoption Significance</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{context.significance}</p>
              </div>

              {/* Notes */}
              {context.notes && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800 leading-relaxed">{context.notes}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={getOfficialExchangeUrl(entity.ticker, entity.listingVenue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <Building2 className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">View on {entity.listingVenue}</span>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
                
                {entity.listingVenue === 'HKEX' && (
                  <a
                    href={getHKEXAnnouncementsUrl(entity.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">HKEX Announcements</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </a>
                )}
                
                {context?.filingUrl && (
                  <a
                    href={context.filingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Related Filings</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </a>
                )}
                
                {context?.website && (
                  <a
                    href={context.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <Globe className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Company Website</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };



  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Summary Statistics */}
        <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white/80 rounded-xl backdrop-blur-sm border border-green-100 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-1">{hkDigitalAssets.length}</div>
              <div className="text-sm text-gray-700 font-medium">Hong Kong Digital Asset Groups</div>
              <div className="text-xs text-gray-500 mt-1">Strong potential for Bitcoin adoption</div>
            </div>
            <div className="text-center p-4 bg-white/80 rounded-xl backdrop-blur-sm border border-blue-100 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-1">{mainlandMining.length}</div>
              <div className="text-sm text-gray-700 font-medium">Mainland China Companies</div>
              <div className="text-xs text-gray-500 mt-1">Mining & technology focus</div>
            </div>
            <div className="text-center p-4 bg-white/80 rounded-xl backdrop-blur-sm border border-purple-100 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-1">{prospects.length}</div>
              <div className="text-sm text-gray-700 font-medium">Total Companies to Watch</div>
              <div className="text-xs text-gray-500 mt-1">Monitoring for Bitcoin adoption</div>
            </div>
          </div>
        </div>

        {/* Hong Kong Digital Asset Groups */}
        {hkDigitalAssets.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Building2 className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Hong Kong Digital Asset Groups</h2>
                <p className="text-gray-600">Companies with mixed crypto portfolios and strong Bitcoin adoption potential</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {hkDigitalAssets.map(renderProspectCard)}
            </div>
          </div>
        )}

        {/* Mainland China Companies */}
        {mainlandMining.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Mainland China Companies</h2>
                <p className="text-gray-600">Mining and technology companies with potential for Bitcoin treasury adoption</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mainlandMining.map(renderProspectCard)}
            </div>
          </div>
        )}

        {/* Other Companies */}
        {others.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Info className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Other Companies to Monitor</h2>
                <p className="text-gray-600">Additional companies being tracked for potential Bitcoin adoption</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {others.map(renderProspectCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {prospects.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
            <div className="max-w-sm mx-auto px-6">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Prospects Currently</h3>
              <p className="text-gray-600">
                There are no companies being monitored for potential Bitcoin adoption at the moment.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Prospects Overview</h3>
            <p className="text-gray-600 max-w-3xl mx-auto">
              These companies represent significant opportunities for Bitcoin adoption in Asia. We monitor their activities and announcements for signs of institutional Bitcoin interest and potential treasury adoption.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
} 