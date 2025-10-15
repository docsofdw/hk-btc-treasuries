'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { RegionalPage } from '@/components/regions/RegionalPage';
import { getRegion } from '@/types/regions';
import { TreasuryEntity } from '@/types/treasury';

interface HoldingResponse {
  id: string;
  company: string;
  ticker: string;
  exchange: string;
  headquarters: string;
  btcHoldings: number;
  costBasisUsd?: number;
  lastDisclosed: string;
  source: string;
  verified: boolean;
  marketCap?: number;
  sharesOutstanding?: number;
  region?: string;
  managerProfile?: string;
  companyType?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  
  // Transform /api/v1/holdings response to match expected format
  if (json.success && json.data?.holdings) {
    return {
      entities: json.data.holdings.map((h: HoldingResponse) => ({
        id: h.id,
        legalName: h.company,
        ticker: h.ticker,
        listingVenue: h.exchange,
        hq: h.headquarters,
        btc: h.btcHoldings,
        costBasisUsd: h.costBasisUsd,
        lastDisclosed: h.lastDisclosed,
        source: h.source,
        verified: h.verified,
        marketCap: h.marketCap,
        sharesOutstanding: h.sharesOutstanding,
        dataSource: 'manual',
        region: h.region,
        managerProfile: h.managerProfile,
        companyType: h.companyType,
      }))
    };
  }
  
  return json;
};

export default function ThailandPage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const region = getRegion('thailand');
  
  const { data, error, isLoading } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/v1/holdings',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await res.json();
        if (data.bitcoin?.usd) {
          setBtcPrice(data.bitcoin.usd);
        }
      } catch (error) {
        console.error('Error fetching BTC price:', error);
      }
    };
    
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter Thailand entities (when data is available)
  const thailandEntities = data?.entities?.filter(entity => 
    entity.region === 'TH' || 
    entity.listingVenue === 'SET' ||
    entity.hq?.toLowerCase().includes('thailand') ||
    entity.hq?.toLowerCase().includes('bangkok')
  ) || [];

  return (
    <RegionalPage
      region={region}
      entities={thailandEntities}
      btcPrice={btcPrice}
      isLoading={isLoading}
      error={error ? 'Failed to load Thailand treasury data' : undefined}
    />
  );
}