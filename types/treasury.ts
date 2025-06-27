export interface TreasuryEntity {
  id: string;
  legalName: string;
  ticker: string;
  listingVenue: 'HKEX' | 'NASDAQ' | 'NYSE' | 'SZSE' | 'SSE';
  hq: string;
  btc: number;
  costBasisUsd: number;
  lastDisclosed: string;
  source: string;
  dataSource?: 'export' | 'filing' | 'manual';
  region?: 'HK' | 'China' | 'ADR';
  verified?: boolean;
  marketCap?: number;
  sharesOutstanding?: number;
  marketDataUpdatedAt?: string;
}

export interface ExportRow {
  Company: string;
  Ticker: string;
  'BTC Holdings': string;
  'USD Value': string;
  'Last Update': string;
}

export interface PriceSnapshot {
  btcUsd: number;
  hkdUsd: number;
  timestamp: Date;
} 