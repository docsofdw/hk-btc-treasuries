'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { RegionalPage } from '@/components/regions/RegionalPage';
import { getRegion } from '@/types/regions';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function JapanPage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const region = getRegion('japan');
  
  const { data, error, isLoading } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries?region=japan',
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

  // Filter Japan entities (when data is available)
  const japanEntities = data?.entities?.filter(entity => 
    entity.region === 'JP' || 
    entity.listingVenue === 'TSE' ||
    entity.hq?.toLowerCase().includes('japan') ||
    entity.hq?.toLowerCase().includes('tokyo')
  ) || [];

  return (
    <RegionalPage
      region={region}
      entities={japanEntities}
      btcPrice={btcPrice}
      isLoading={isLoading}
      error={error ? 'Failed to load Japan treasury data' : undefined}
    />
  );
}