export type PipelineStageId = 'rumoured' | 'board_vote' | 'filing' | 'verified';

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  estimatedTimeframe?: string;
  order: number;
}

export interface TreasuryEntity {
  id: string;
  legalName: string;
  ticker: string;
  listingVenue: 'HKEX' | 'NASDAQ' | 'NYSE' | 'SZSE' | 'SSE' | 'SGX' | 'KRX' | 'SET' | 'TSE';
  hq: string;
  btc: number;
  costBasisUsd: number;
  lastDisclosed: string;
  source: string;
  interestUrl?: string; // For prospects: press releases, blog posts, etc.
  dataSource?: 'export' | 'filing' | 'manual';
  region?: 'HK' | 'China' | 'ADR' | 'SG' | 'KR' | 'TH' | 'JP'; // Legacy region field
  verified?: boolean;
  marketCap?: number;
  sharesOutstanding?: number;
  marketDataUpdatedAt?: string;
  // Pipeline stage for prospects
  pipelineStage?: PipelineStageId;
  stageUpdatedAt?: string;
  estimatedBtc?: number; // For prospects without confirmed holdings
  confidenceLevel?: 'low' | 'medium' | 'high';
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