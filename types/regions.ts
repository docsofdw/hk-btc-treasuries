export type RegionId = 'hong-kong' | 'singapore' | 'south-korea' | 'thailand' | 'japan' | 'mainland-china';

export interface Region {
  id: RegionId;
  name: string;
  shortName: string;
  flag: string;
  currency: string;
  primaryExchange: string;
  regulatoryBody: string;
  timezone: string;
  slug: string;
  description: string;
  marketDescription: string;
  regulatoryStatus: 'friendly' | 'neutral' | 'restrictive' | 'developing';
  btcLegalStatus: 'legal' | 'restricted' | 'unclear' | 'banned';
  corporateAdoption: 'active' | 'emerging' | 'early' | 'none';
  isActive: boolean;
  launchDate?: string;
  gdp: number; // in USD billions
  marketCap: number; // stock market cap in USD billions
  population: number; // in millions
  seoKeywords: string[];
}

export const REGIONS: Record<RegionId, Region> = {
  'hong-kong': {
    id: 'hong-kong',
    name: 'Hong Kong',
    shortName: 'HK',
    flag: '🇭🇰',
    currency: 'HKD',
    primaryExchange: 'HKEX',
    regulatoryBody: 'SFC (Securities and Futures Commission)',
    timezone: 'Asia/Hong_Kong',
    slug: 'hong-kong',
    description: 'Asia\'s leading financial hub with progressive crypto regulations',
    marketDescription: 'Hong Kong Stock Exchange (HKEX) is the world\'s 4th largest stock exchange by market capitalization.',
    regulatoryStatus: 'friendly',
    btcLegalStatus: 'legal',
    corporateAdoption: 'active',
    isActive: true,
    launchDate: '2024-12-01',
    gdp: 365,
    marketCap: 4500,
    population: 7.5,
    seoKeywords: ['Hong Kong Bitcoin', 'HKEX Bitcoin', 'HK corporate treasury', 'Asia Bitcoin adoption'],
  },
  'singapore': {
    id: 'singapore',
    name: 'Singapore',
    shortName: 'SG',
    flag: '🇸🇬',
    currency: 'SGD',
    primaryExchange: 'SGX',
    regulatoryBody: 'MAS (Monetary Authority of Singapore)',
    timezone: 'Asia/Singapore',
    slug: 'singapore',
    description: 'Southeast Asia\'s fintech capital with clear digital asset regulations',
    marketDescription: 'Singapore Exchange (SGX) hosts over 700 listed companies with S$900B market cap.',
    regulatoryStatus: 'friendly',
    btcLegalStatus: 'legal',
    corporateAdoption: 'emerging',
    isActive: false,
    gdp: 397,
    marketCap: 900,
    population: 5.9,
    seoKeywords: ['Singapore Bitcoin', 'SGX Bitcoin', 'MAS crypto', 'Southeast Asia Bitcoin'],
  },
  'south-korea': {
    id: 'south-korea',
    name: 'South Korea',
    shortName: 'KR',
    flag: '🇰🇷',
    currency: 'KRW',
    primaryExchange: 'KRX',
    regulatoryBody: 'FSC (Financial Services Commission)',
    timezone: 'Asia/Seoul',
    slug: 'south-korea',
    description: 'Major Asian economy with growing institutional crypto interest',
    marketDescription: 'Korea Exchange (KRX) is home to tech giants like Samsung and SK Group.',
    regulatoryStatus: 'developing',
    btcLegalStatus: 'legal',
    corporateAdoption: 'early',
    isActive: false,
    gdp: 1811,
    marketCap: 2200,
    population: 51.7,
    seoKeywords: ['South Korea Bitcoin', 'KRX Bitcoin', 'Korean corporate treasury', 'Samsung Bitcoin'],
  },
  'thailand': {
    id: 'thailand',
    name: 'Thailand',
    shortName: 'TH',
    flag: '🇹🇭',
    currency: 'THB',
    primaryExchange: 'SET',
    regulatoryBody: 'SEC Thailand',
    timezone: 'Asia/Bangkok',
    slug: 'thailand',
    description: 'Emerging market with progressive digital asset adoption',
    marketDescription: 'Stock Exchange of Thailand (SET) represents the kingdom\'s largest corporations.',
    regulatoryStatus: 'developing',
    btcLegalStatus: 'legal',
    corporateAdoption: 'early',
    isActive: false,
    gdp: 544,
    marketCap: 700,
    population: 70.0,
    seoKeywords: ['Thailand Bitcoin', 'SET Bitcoin', 'Thai corporate treasury', 'Thailand crypto'],
  },
  'japan': {
    id: 'japan',
    name: 'Japan',
    shortName: 'JP',
    flag: '🇯🇵',
    currency: 'JPY',
    primaryExchange: 'TSE',
    regulatoryBody: 'JFSA (Japan Financial Services Agency)',
    timezone: 'Asia/Tokyo',
    slug: 'japan',
    description: 'World\'s 3rd largest economy with established crypto framework',
    marketDescription: 'Tokyo Stock Exchange is the world\'s 3rd largest with ¥750T market cap.',
    regulatoryStatus: 'neutral',
    btcLegalStatus: 'legal',
    corporateAdoption: 'early',
    isActive: false,
    gdp: 4239,
    marketCap: 6500,
    population: 125.0,
    seoKeywords: ['Japan Bitcoin', 'TSE Bitcoin', 'Japanese corporate treasury', 'JFSA crypto'],
  },
  'mainland-china': {
    id: 'mainland-china',
    name: 'Mainland China',
    shortName: 'CN',
    flag: '🇨🇳',
    currency: 'CNY',
    primaryExchange: 'SSE/SZSE',
    regulatoryBody: 'CSRC (China Securities Regulatory Commission)',
    timezone: 'Asia/Shanghai',
    slug: 'mainland-china',
    description: 'World\'s 2nd largest economy with restrictive crypto policies',
    marketDescription: 'Shanghai and Shenzhen exchanges combine for world\'s 2nd largest market.',
    regulatoryStatus: 'restrictive',
    btcLegalStatus: 'banned',
    corporateAdoption: 'none',
    isActive: false,
    gdp: 17734,
    marketCap: 12000,
    population: 1412.0,
    seoKeywords: ['China Bitcoin ban', 'CSRC crypto', 'Chinese corporate policy', 'mainland China Bitcoin'],
  },
};

export const REGIONS_ARRAY = Object.values(REGIONS).sort((a, b) => {
  // Sort by active status first, then by GDP
  if (a.isActive && !b.isActive) return -1;
  if (!a.isActive && b.isActive) return 1;
  return b.gdp - a.gdp;
});

export const ACTIVE_REGIONS = REGIONS_ARRAY.filter(region => region.isActive);
export const UPCOMING_REGIONS = REGIONS_ARRAY.filter(region => !region.isActive);

export function getRegion(regionId: RegionId): Region {
  return REGIONS[regionId];
}

export function getRegionBySlug(slug: string): Region | null {
  return REGIONS_ARRAY.find(region => region.slug === slug) || null;
}

// Helper function to get region statistics
export function getRegionStats() {
  const totalGDP = REGIONS_ARRAY.reduce((sum, region) => sum + region.gdp, 0);
  const totalMarketCap = REGIONS_ARRAY.reduce((sum, region) => sum + region.marketCap, 0);
  const totalPopulation = REGIONS_ARRAY.reduce((sum, region) => sum + region.population, 0);
  
  return {
    totalRegions: REGIONS_ARRAY.length,
    activeRegions: ACTIVE_REGIONS.length,
    upcomingRegions: UPCOMING_REGIONS.length,
    totalGDP,
    totalMarketCap,
    totalPopulation,
    friendlyRegions: REGIONS_ARRAY.filter(r => r.regulatoryStatus === 'friendly').length,
  };
}

// Helper function for SEO meta generation
export function getRegionSEO(region: Region) {
  return {
    title: `${region.name} Bitcoin Treasury Companies | Asia's Bitcoin Treasuries`,
    description: `Track publicly disclosed Bitcoin holdings by ${region.name}-listed companies. ${region.description}`,
    keywords: region.seoKeywords.join(', '),
    openGraph: {
      title: `${region.flag} ${region.name} Bitcoin Corporate Treasuries`,
      description: `Monitor ${region.name} companies adopting Bitcoin treasury strategies. Real-time data from ${region.primaryExchange}.`,
    },
  };
}