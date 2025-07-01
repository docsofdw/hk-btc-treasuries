'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { RegionalPage } from '@/components/regions/RegionalPage';
import { getRegion } from '@/types/regions';
import { TreasuryEntity } from '@/types/treasury';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SingaporePage() {
  const [btcPrice, setBtcPrice] = useState(107038);
  const region = getRegion('singapore');
  
  const { data, error, isLoading } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries?region=singapore',
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

  // Filter Singapore entities (when data is available)
  const singaporeEntities = data?.entities?.filter(entity => 
    entity.region === 'SG' || 
    entity.listingVenue === 'SGX' ||
    entity.hq?.toLowerCase().includes('singapore')
  ) || [];

  return (
    <RegionalPage
      region={region}
      entities={singaporeEntities}
      btcPrice={btcPrice}
      isLoading={isLoading}
      error={error ? 'Failed to load Singapore treasury data' : undefined}
    />
  );
}