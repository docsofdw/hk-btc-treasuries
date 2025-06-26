import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hour cache

const EXPORT_URL = process.env.BITCOINTREASURIES_EXPORT_URL || '';

// Define types for CSV row data
interface CSVRow {
  Company?: string;
  Ticker?: string;
  'BTC Holdings'?: string;
  'USD Value'?: string;
  'Last Update'?: string;
}

export async function GET() {
  try {
    // Try to get cached data from Supabase first
    const supabase = await createClient();
    const { data: cachedData } = await supabase
      .from('raw_exports')
      .select('data, downloaded_at')
      .order('downloaded_at', { ascending: false })
      .limit(1)
      .single();

    // If we have recent data (< 1 hour), return it
    if (cachedData && new Date(cachedData.downloaded_at).getTime() > Date.now() - 3600000) {
      return NextResponse.json(cachedData.data, {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
      });
    }

    // Fetch fresh data
    const response = await fetch(EXPORT_URL);
    if (!response.ok) throw new Error('Failed to fetch export');

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    // Filter for HK/China entities
    const filteredData = records.filter((row: CSVRow) => {
      const ticker = row.Ticker || '';
      const company = row.Company || '';
      return (
        ticker.includes('.HK') || 
        ticker.includes('.SZ') || 
        ticker.includes('.SH') ||
        company.toLowerCase().includes('china') ||
        company.toLowerCase().includes('hong kong')
      );
    });

    // Transform to our format
    const entities = filteredData.map((row: CSVRow, index: number) => ({
      id: `export-${index}`,
      legalName: row.Company,
      ticker: row.Ticker,
      listingVenue: determineVenue(row.Ticker || ''),
      hq: determineHQ(row.Company || '', row.Ticker || ''),
      btc: parseFloat(row['BTC Holdings']?.replace(/,/g, '') || '0'),
      costBasisUsd: parseFloat(row['USD Value']?.replace(/[$,]/g, '') || '0'),
      lastDisclosed: row['Last Update'] || new Date().toISOString(),
      source: EXPORT_URL,
      dataSource: 'export',
    }));

    // Store in Supabase
    await supabase.from('raw_exports').insert({
      source: 'bitcointreasuries',
      data: { entities, timestamp: new Date().toISOString() },
    });

    return NextResponse.json({ entities }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching treasuries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

function determineVenue(ticker: string): string {
  if (ticker.includes('.HK')) return 'HKEX';
  if (ticker.includes('.SZ')) return 'SZSE';
  if (ticker.includes('.SH')) return 'SSE';
  if (!ticker.includes('.')) return 'NASDAQ';
  return 'NYSE';
}

function determineHQ(company: string, ticker: string): string {
  const companyLower = company.toLowerCase();
  if (ticker.includes('.HK') || companyLower.includes('hong kong')) return 'Hong Kong';
  if (companyLower.includes('beijing')) return 'Beijing, China';
  if (companyLower.includes('shanghai')) return 'Shanghai, China';
  if (companyLower.includes('shenzhen')) return 'Shenzhen, China';
  return 'China';
} 