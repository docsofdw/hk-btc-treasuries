'use client';

import { Globe } from 'lucide-react';
import { REGIONS } from '@/types/regions';

interface RegionsOverviewProps {
  className?: string;
}

const COMING_SOON_REGIONS = [
  { ...REGIONS['singapore'], summary: 'Clear regulatory framework for crypto businesses' },
  { ...REGIONS['japan'], summary: 'World\'s 3rd largest economy with established crypto rules' },
  { ...REGIONS['south-korea'], summary: 'Major tech hub with growing institutional interest' },
  { ...REGIONS['thailand'], summary: 'Emerging market with progressive crypto adoption' },
];

export function RegionsOverview({ className = '' }: RegionsOverviewProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Regional Expansion</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Starting with Hong Kong, we're expanding across Asia-Pacific markets
        </p>
      </div>

      {/* Active Region - Hong Kong */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{REGIONS['hong-kong'].flag}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Hong Kong</h3>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                  ✓ ACTIVE
                </span>
                <span className="text-sm text-gray-600">{REGIONS['hong-kong'].primaryExchange}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-gray-700 mb-4">
          {REGIONS['hong-kong'].description}. Currently tracking HKEX-listed companies and monitoring regulatory developments.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-gray-600 mb-1">Exchange</div>
            <div className="font-semibold text-gray-900">HKEX</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-gray-600 mb-1">Market Cap</div>
            <div className="font-semibold text-gray-900">$4.5T</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-gray-600 mb-1">Status</div>
            <div className="font-semibold text-green-600">Live</div>
          </div>
        </div>
      </div>

      {/* Coming Soon Regions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMING_SOON_REGIONS.map((region) => (
            <div
              key={region.id}
              className="bg-white rounded-lg border border-gray-200 p-5 relative"
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full border border-yellow-300">
                  Coming Soon
                </span>
              </div>
              
              {/* Content */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{region.flag}</span>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {region.name}
                  </h4>
                  <div className="text-sm text-gray-600">{region.primaryExchange}</div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {region.summary}
              </p>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">GDP:</span> ${(region.gdp / 1000).toFixed(1)}T
                </div>
                <div>
                  <span className="font-medium">Legal:</span> {region.btcLegalStatus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="text-sm text-blue-800">
          <span className="font-semibold">Expansion roadmap:</span> We're prioritizing markets based on regulatory clarity, 
          Bitcoin legal status, and corporate adoption readiness. Follow us on{' '}
          <a href="https://x.com/docsofduke" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
            X
          </a>{' '}
          for updates.
        </div>
      </div>
    </div>
  );
}