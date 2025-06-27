'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ScanResult {
  success: boolean;
  scanned: number;
  found: number;
  results: Array<{
    entity: string;
    filing: string;
    btc?: number | null;
    type?: string;
    date?: string;
  }>;
  timestamp: string;
  error?: string;
}

interface FilingResult {
  entity: string;
  filing: string;
  btc?: number | null;
  type?: string;
  date?: string;
}

interface ScanResponse {
  success: boolean;
  summary?: {
    totalScanned: number;
    totalFound: number;
    hkexScanned: number;
    hkexFound: number;
    secScanned: number;
    secFound: number;
  };
  hkex?: ScanResult;
  sec?: ScanResult;
  newFilings?: FilingResult[];
  errors?: string[];
  timestamp: string;
}

export default function ScanFilingsPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanFilings = async () => {
    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/cron/scan-filings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FILING_CRON_SECRET || 'manual-trigger'}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Scan failed');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanHKEX = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-hkex-filings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResults({ 
        success: data.success, 
        hkex: data, 
        timestamp: data.timestamp 
      } as ScanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HKEX scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanSEC = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scan-sec-filings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResults({ 
        success: data.success, 
        sec: data, 
        timestamp: data.timestamp 
      } as ScanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SEC scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Filing Scanner</h1>
            <p className="text-gray-600 mt-1">
              Manually trigger scans for Bitcoin-related regulatory filings
            </p>
          </div>

          <div className="p-6">
            {/* Manual Trigger Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Full Scan</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Scan both HKEX and SEC for new filings
                </p>
                <Button 
                  onClick={handleScanFilings}
                  disabled={isScanning}
                  className="w-full"
                >
                  {isScanning ? 'Scanning...' : 'Start Full Scan'}
                </Button>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">HKEX Only</h3>
                <p className="text-sm text-red-700 mb-3">
                  Scan Hong Kong Exchange filings only
                </p>
                <Button 
                  onClick={handleScanHKEX}
                  disabled={isScanning}
                  variant="outline"
                  className="w-full"
                >
                  {isScanning ? 'Scanning...' : 'Scan HKEX'}
                </Button>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">SEC Only</h3>
                <p className="text-sm text-green-700 mb-3">
                  Scan SEC EDGAR filings only
                </p>
                <Button 
                  onClick={handleScanSEC}
                  disabled={isScanning}
                  variant="outline"
                  className="w-full"
                >
                  {isScanning ? 'Scanning...' : 'Scan SEC'}
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isScanning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800">Scanning for filings...</span>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  This may take a few minutes depending on the number of entities to scan.
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-800 mb-2">Scan Failed</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Scan Results</h3>
                  
                  {/* Summary Stats */}
                  {results.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white rounded p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.summary.totalScanned}
                        </div>
                        <div className="text-sm text-gray-600">Entities Scanned</div>
                      </div>
                      <div className="bg-white rounded p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {results.summary.totalFound}
                        </div>
                        <div className="text-sm text-gray-600">Filings Found</div>
                      </div>
                      <div className="bg-white rounded p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {results.summary.hkexFound}
                        </div>
                        <div className="text-sm text-gray-600">HKEX Filings</div>
                      </div>
                      <div className="bg-white rounded p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.summary.secFound}
                        </div>
                        <div className="text-sm text-gray-600">SEC Filings</div>
                      </div>
                    </div>
                  )}

                  {/* Individual Results */}
                  {results.hkex && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">HKEX Scan</h4>
                      <div className="text-sm text-gray-600">
                        Status: <span className={results.hkex.success ? 'text-green-600' : 'text-red-600'}>
                          {results.hkex.success ? 'Success' : 'Failed'}
                        </span>
                        {results.hkex.error && (
                          <span className="ml-2 text-red-600">- {results.hkex.error}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {results.sec && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">SEC Scan</h4>
                      <div className="text-sm text-gray-600">
                        Status: <span className={results.sec.success ? 'text-green-600' : 'text-red-600'}>
                          {results.sec.success ? 'Success' : 'Failed'}
                        </span>
                        {results.sec.error && (
                          <span className="ml-2 text-red-600">- {results.sec.error}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* New Filings */}
                  {results.newFilings && results.newFilings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">New Filings Found</h4>
                      <div className="space-y-2">
                        {results.newFilings.slice(0, 10).map((filing, index) => (
                          <div key={index} className="bg-white rounded border p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {filing.entity}
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                  {filing.filing}
                                </div>
                                {filing.btc && (
                                  <div className="text-sm text-green-600">
                                    {filing.btc.toLocaleString()} BTC
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {filing.type}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {results.errors && results.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {results.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-4">
                    Scan completed at {new Date(results.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-yellow-800 mb-2">How It Works</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>HKEX Scanner:</strong> Searches Hong Kong Exchange announcements for Bitcoin-related keywords</li>
                <li>• <strong>SEC Scanner:</strong> Searches SEC EDGAR database for filings from tracked entities</li>
                <li>• <strong>Storage:</strong> New filings are stored in the raw_filings table for review</li>
                <li>• <strong>Automation:</strong> Scans run automatically every 4 hours via cron job</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 