'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Search, 
  Database, 
  AlertCircle, 
  CheckCircle2,
  Globe,
  TrendingUp,
  Hash,
  Calendar,
  ExternalLink,
  Building,
  RefreshCw,
  Settings,
  PlayCircle,
  PauseCircle,
  Clock
} from 'lucide-react';

interface AdminStats {
  totalCompanies: number;
  totalBTC: number;
  lastScanTime: string;
  pendingApprovals: number;
  scansToday: number;
}

interface ScanResult {
  success: boolean;
  timestamp: string;
  stats: {
    searchesPerformed: number;
    totalFindings: number;
    uniqueFindings: number;
    duplicatesSkipped: number;
  };
  findings: Array<{
    company: {
      name: string;
      nameLocal?: string;
      ticker: string;
      exchange: string;
    };
    bitcoin: {
      totalHoldings: number;
      purchaseAmount?: number;
      costBasis?: number;
      averagePrice?: number;
    };
    disclosure: {
      date: string;
      url: string;
      verified: boolean;
    };
    metadata: {
      source: string;
      query: string;
      confidence: number;
    };
  }>;
  summary: {
    totalCompanies: number;
    totalBitcoinFound: number;
    byExchange: Record<string, number>;
    topHoldings: Array<{
      company: string;
      ticker: string;
      btc: number;
    }>;
  };
  nextSteps: string[];
  error?: string;
}

export default function AdminDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<number>>(new Set());
  const [processingApproval, setProcessingApproval] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);

  // Load admin stats on component mount
  useEffect(() => {
    loadAdminStats();
    // Check if auto-scan is enabled (you can store this in localStorage)
    const autoScan = localStorage.getItem('autoScanEnabled') === 'true';
    setAutoScanEnabled(autoScan);
  }, []);

  const loadAdminStats = async () => {
    try {
      // This would be a simplified stats endpoint
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        setAdminStats(stats);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setSelectedFindings(new Set());

    try {
      const response = await fetch('/api/admin/dynamic-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Scan failed');
      }
      
      setScanResult(data);
      await loadAdminStats(); // Refresh stats after scan
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFinding = (index: number) => {
    const newSelected = new Set(selectedFindings);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFindings(newSelected);
  };

  const approveSelected = async () => {
    if (selectedFindings.size === 0 || !scanResult) {
      alert('Please select findings to approve');
      return;
    }

    setProcessingApproval(true);
    
    try {
      const selectedData = Array.from(selectedFindings).map(index => scanResult.findings[index]);
      
      for (const finding of selectedData) {
        const response = await fetch('/api/admin/approve-finding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticker: finding.company.ticker,
            legalName: finding.company.name,
            btc: finding.bitcoin.totalHoldings,
            costBasisUsd: finding.bitcoin.costBasis,
            sourceUrl: finding.disclosure.url,
            lastDisclosed: finding.disclosure.date,
            exchange: finding.company.exchange,
            confidence: finding.metadata.confidence,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to add ${finding.company.name}: ${errorData.error || response.statusText}`);
        }
      }

      // Remove approved findings from display
      const remainingFindings = scanResult.findings.filter((_, index) => !selectedFindings.has(index));
      setScanResult({
        ...scanResult,
        findings: remainingFindings,
        stats: {
          ...scanResult.stats,
          uniqueFindings: remainingFindings.length,
        },
      });

      setSelectedFindings(new Set());
      await loadAdminStats(); // Refresh stats
      alert(`${selectedData.length} findings approved and added to database`);
    } catch (err) {
      alert(`Error approving findings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingApproval(false);
    }
  };

  const toggleAutoScan = () => {
    const newValue = !autoScanEnabled;
    setAutoScanEnabled(newValue);
    localStorage.setItem('autoScanEnabled', newValue.toString());
  };

  const getExchangeColor = (exchange: string) => {
    const colors = {
      'HKEX': 'bg-red-100 text-red-800',
      'SZSE': 'bg-blue-100 text-blue-800',
      'SSE': 'bg-green-100 text-green-800',
      'TSE': 'bg-purple-100 text-purple-800',
      'KOSPI': 'bg-yellow-100 text-yellow-800',
      'SGX': 'bg-pink-100 text-pink-800',
      'ASX': 'bg-indigo-100 text-indigo-800',
      'UNKNOWN': 'bg-gray-100 text-gray-800'
    };
    return colors[exchange as keyof typeof colors] || colors.UNKNOWN;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📊 Asia Bitcoin Treasury Admin</h1>
        <p className="text-gray-600">
          Simplified admin dashboard to manage Bitcoin treasury scanning and data
        </p>
      </div>

      {/* Quick Stats */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Building className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-bold">{adminStats.totalCompanies}</span>
              </div>
              <p className="text-sm text-gray-600">Total Companies</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Hash className="w-6 h-6 text-orange-600" />
                <span className="text-2xl font-bold">{adminStats.totalBTC.toFixed(0)}</span>
              </div>
              <p className="text-sm text-gray-600">Total BTC</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-6 h-6 text-green-600" />
                <span className="text-sm font-bold">{adminStats.lastScanTime || 'Never'}</span>
              </div>
              <p className="text-sm text-gray-600">Last Scan</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <span className="text-2xl font-bold">{adminStats.pendingApprovals}</span>
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <span className="text-2xl font-bold">{adminStats.scansToday}</span>
              </div>
              <p className="text-sm text-gray-600">Scans Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Control Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Control Panel
          </CardTitle>
          <CardDescription>
            Manage your Bitcoin treasury scanning operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={runScan}
              disabled={isScanning}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Run Manual Scan
                </>
              )}
            </Button>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-scan"
                checked={autoScanEnabled}
                onCheckedChange={toggleAutoScan}
              />
              <label htmlFor="auto-scan" className="text-sm font-medium">
                Auto-scan every 6 hours
              </label>
              {autoScanEnabled ? (
                <PlayCircle className="w-4 h-4 text-green-600" />
              ) : (
                <PauseCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>

            <Button
              onClick={loadAdminStats}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Search className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold">{scanResult.stats.searchesPerformed}</span>
                </div>
                <p className="text-sm text-gray-600">Searches</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold">{scanResult.stats.totalFindings}</span>
                </div>
                <p className="text-sm text-gray-600">Total Found</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold">{scanResult.stats.uniqueFindings}</span>
                </div>
                <p className="text-sm text-gray-600">New</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Hash className="w-8 h-8 text-orange-600" />
                  <span className="text-2xl font-bold">
                    {scanResult.summary?.totalBitcoinFound?.toFixed(0) || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600">BTC Found</p>
              </CardContent>
            </Card>
          </div>

          {/* Findings Table */}
          {scanResult.findings && scanResult.findings.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>New Discoveries</CardTitle>
                    <CardDescription>
                      Review and approve findings for database inclusion
                    </CardDescription>
                  </div>
                  {selectedFindings.size > 0 && (
                    <Button
                      onClick={approveSelected}
                      disabled={processingApproval}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingApproval ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve {selectedFindings.size} Selected
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Select</th>
                        <th className="px-4 py-3 text-left">Company</th>
                        <th className="px-4 py-3 text-left">Exchange</th>
                        <th className="px-4 py-3 text-left">BTC</th>
                        <th className="px-4 py-3 text-left">Confidence</th>
                        <th className="px-4 py-3 text-left">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scanResult.findings.map((finding, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedFindings.has(index)}
                              onCheckedChange={() => toggleFinding(index)}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium">{finding.company.name}</div>
                              <div className="text-sm text-gray-500 font-mono">{finding.company.ticker}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getExchangeColor(finding.company.exchange)}>
                              {finding.company.exchange}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium">
                              {finding.bitcoin.totalHoldings?.toLocaleString()} BTC
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getConfidenceBadge(finding.metadata.confidence)}>
                              {finding.metadata.confidence}%
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            {finding.disclosure.url ? (
                              <a
                                href={finding.disclosure.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400">No URL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No new findings in this scan</p>
                <p className="text-sm text-gray-400 mt-2">
                  All discoveries were duplicates or no new announcements found
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions */}
      {!scanResult && !isScanning && (
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Run a Manual Scan</h4>
                  <p className="text-sm text-gray-600">Click "Run Manual Scan" to search for new Bitcoin treasury announcements</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Review Results</h4>
                  <p className="text-sm text-gray-600">Check confidence scores and verify company information</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Approve Findings</h4>
                  <p className="text-sm text-gray-600">Select good findings and click "Approve Selected" to add them to your database</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h4 className="font-medium">Enable Auto-Scan</h4>
                  <p className="text-sm text-gray-600">Turn on auto-scanning to run searches every 6 hours automatically</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}