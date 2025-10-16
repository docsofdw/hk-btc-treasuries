'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import numeral from 'numeral';
import { ExternalLink, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { getHKEXCompanyPageUrl } from '@/lib/utils';

dayjs.extend(relativeTime);

interface CompanyData {
  id: string;
  legalName: string;
  ticker: string;
  listingVenue: string;
  hq: string;
  btc: number;
  deltaBtc?: number | null;
  costBasisUsd?: number;
  lastDisclosed: string;
  source: string;
  verified: boolean;
  marketCap?: number;
  region?: string;
  managerProfile?: string;
  companyType?: string;
}

interface Filing {
  id: string;
  date: string;
  btc: number;
  totalHoldings: number;
  btcChange: number | null;
  category: string;
  title?: string;
  pdfUrl: string;
  verified: boolean;
}

export default function CompanyPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [btcPrice, setBtcPrice] = useState(110000);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch company details
        const response = await fetch(`/api/v1/company/${encodeURIComponent(ticker)}`);
        if (!response.ok) {
          throw new Error('Company not found');
        }
        
        const data = await response.json();
        setCompany(data.company);
        setFilings(data.filings || []);
        
        // Fetch BTC price
        try {
          const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
          const priceData = await priceRes.json();
          if (priceData.bitcoin?.usd) {
            setBtcPrice(priceData.bitcoin.usd);
          }
        } catch (err) {
          console.error('Error fetching BTC price:', err);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-64 bg-gray-200 rounded-xl"></div>
                <div className="h-48 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="lg:col-span-3">
                <div className="h-96 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all companies
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <h1 className="text-2xl font-semibold text-red-900 mb-2">Company Not Found</h1>
            <p className="text-red-700">{error || 'The company you are looking for does not exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const usdValue = company.btc * btcPrice;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1120px] mx-auto px-5 md:px-6 py-8">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all companies
        </Link>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT COLUMN - Company Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Header */}
            <div>
              <h1 className="text-[32px] md:text-[36px] font-semibold text-gray-900 mb-4 leading-tight">
                {company.legalName}
              </h1>
              
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-900 text-white text-sm font-medium">
                  {company.ticker}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 text-sm font-medium">
                  {company.listingVenue}
                </span>
                {company.managerProfile === 'ACTIVE_MANAGER' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 text-sm font-medium">
                    Active Manager
                  </span>
                )}
                {company.managerProfile === 'PASSIVE_HOLDER' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 text-sm font-medium">
                    Holder
                  </span>
                )}
              </div>

              <p className="text-gray-600">
                <span className="font-medium">Headquarters:</span> {company.hq}
              </p>
            </div>

            {/* Holdings Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total BTC Holdings
              </h2>
              
              <div>
                <div className="text-[40px] font-semibold tabular-nums text-gray-900 leading-none mb-2">
                  ₿ {numeral(company.btc).format('0,0')}
                </div>
                <div className="text-[24px] text-gray-600 tabular-nums">
                  ${numeral(usdValue).format('0.0a')}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium text-gray-900">
                    {dayjs(company.lastDisclosed).format('MMM D, YYYY')}
                  </span>
                </div>
                
                {company.deltaBtc !== null && company.deltaBtc !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change Since Last</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      company.deltaBtc > 0 ? 'text-green-600' : 
                      company.deltaBtc < 0 ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {company.deltaBtc > 0 && <TrendingUp className="w-4 h-4" />}
                      {company.deltaBtc < 0 && <TrendingDown className="w-4 h-4" />}
                      {company.deltaBtc > 0 && '+'}
                      {numeral(company.deltaBtc).format('0,0')} BTC
                    </span>
                  </div>
                )}

                {company.costBasisUsd && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost Basis</span>
                    <span className="font-medium text-gray-900">
                      ${numeral(company.costBasisUsd).format('0.0a')}
                    </span>
                  </div>
                )}
              </div>

              {company.listingVenue === 'HKEX' && (
                <a
                  href={getHKEXCompanyPageUrl(company.ticker)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  View on HKEX
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Verification Badge */}
            {company.verified && (
              <div className="border border-green-500 bg-green-50 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Verified</div>
                    <div className="text-sm">
                      Holdings verified by admin review
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Filing Timeline */}
          <div className="lg:col-span-3">
            <h2 className="text-[22px] font-semibold mb-4 text-gray-900">
              Filing History
            </h2>

            {filings.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-500">No filing history available yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filings.map((filing) => (
                  <div
                    key={filing.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 hover:border-gray-300 transition-colors"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {dayjs(filing.date).format('MMM D, YYYY')}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-gray-300 text-gray-600 text-xs">
                          {filing.category || 'Announcement'}
                        </span>
                      </div>
                      {filing.btcChange !== null && (
                        <span className={`text-sm font-semibold ${
                          filing.btcChange > 0 ? 'text-green-600' : 
                          filing.btcChange < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {filing.btcChange > 0 && '+'}
                          {numeral(filing.btcChange).format('0,0')} BTC
                        </span>
                      )}
                    </div>

                    {/* Total holdings */}
                    <p className="text-sm text-gray-700">
                      Total holdings: <span className="font-semibold">{numeral(filing.totalHoldings).format('0,0')} BTC</span>
                    </p>

                    {/* Title/snippet */}
                    {filing.title && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {filing.title}
                      </p>
                    )}

                    {/* Action button */}
                    <div className="pt-2">
                      <a
                        href={filing.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        Open Filing
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

