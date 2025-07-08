'use client';

import { useState } from 'react';
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
  XCircle
} from 'lucide-react';

// Enhanced interface matching the new edge function structure
interface UpdateResult {
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

export default function DynamicUpdatesPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<number>>(new Set());
  const [processingApproval, setProcessingApproval] = useState(false);

  const runDynamicUpdate = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setSelectedFindings(new Set());

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dynamic-data-updater`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Update failed');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
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
    if (selectedFindings.size === 0 || !result) {
      alert('Please select findings to approve');
      return;
    }

    setProcessingApproval(true);
    
    try {
      const selectedData = Array.from(selectedFindings).map(index => result.findings[index]);
      
      // Process each selected finding
      const results = [];
      for (const finding of selectedData) {
        try {
          const response = await fetch('/api/admin/manual-treasury-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticker: finding.company.ticker || 'UNKNOWN',
              legalName: finding.company.name || 'Unknown Company',
              btc: finding.bitcoin.totalHoldings || 0,
              costBasisUsd: finding.bitcoin.costBasis,
              sourceUrl: finding.disclosure.url || '',
              lastDisclosed: finding.disclosure.date || new Date().toISOString(),
              exchange: finding.company.exchange || 'UNKNOWN',
              confidence: finding.metadata.confidence || 50,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('API Error:', errorData);
            results.push({ 
              company: finding.company.name, 
              success: false, 
              error: errorData.error || response.statusText 
            });
          } else {
            const responseData = await response.json();
            results.push({ 
              company: finding.company.name, 
              success: true, 
              data: responseData 
            });
          }
        } catch (error) {
          results.push({ 
            company: finding.company.name, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Show detailed results
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        // Remove successfully approved findings from display
        const successfulCompanies = results
          .filter(r => r.success)
          .map(r => r.company);
        
        const remainingFindings = result.findings.filter((finding, index) => {
          if (!selectedFindings.has(index)) return true;
          return !successfulCompanies.includes(finding.company.name);
        });
        
        setResult({
          ...result,
          findings: remainingFindings,
          stats: {
            ...result.stats,
            uniqueFindings: remainingFindings.length,
          },
        });

        setSelectedFindings(new Set());
      }
      
      // Show comprehensive feedback
      let message = `✅ ${successCount} findings approved and added to database`;
      if (failedCount > 0) {
        message += `\n❌ ${failedCount} findings failed`;
        const failures = results.filter(r => !r.success);
        failures.forEach(f => {
          message += `\n• ${f.company}: ${f.error}`;
        });
      }
      message += `\n\n🔄 Please refresh your main website to see the updates.`;
      
      alert(message);
      
    } catch (err) {
      console.error('Approval error:', err);
      alert(`❌ Error approving findings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingApproval(false);
    }
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Asia-Pacific Bitcoin Treasury Scanner</h1>
        <p className="text-gray-600">
          Discover and track Bitcoin holdings of publicly listed companies across Asian markets
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run Dynamic Update</CardTitle>
          <CardDescription>
            This will search for recent Bitcoin treasury announcements using Perplexity AI and Firecrawl
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-4">
                <p className="mb-2">This process will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Search HKEX, Shanghai, Shenzhen, Tokyo, Korea, Singapore, and Australian exchanges</li>
                  <li>Use multi-language queries (English, Chinese, Japanese, Korean)</li>
                  <li>Extract structured data using Perplexity AI and Firecrawl</li>
                  <li>Validate findings and check for duplicates</li>
                  <li>Present results for manual review and approval</li>
                </ul>
              </div>
            </div>
            <Button
              onClick={runDynamicUpdate}
              disabled={isRunning}
              size="lg"
              className="ml-4"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Run Dynamic Update
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Search className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold">{result.stats.searchesPerformed}</span>
                </div>
                <p className="text-sm text-gray-600">Searches Performed</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold">{result.stats.totalFindings}</span>
                </div>
                <p className="text-sm text-gray-600">Total Findings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold">{result.stats.uniqueFindings}</span>
                </div>
                <p className="text-sm text-gray-600">New Companies</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Hash className="w-8 h-8 text-orange-600" />
                  <span className="text-2xl font-bold">
                    {result.summary?.totalBitcoinFound?.toFixed(2) || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Total BTC Found</p>
              </CardContent>
            </Card>
          </div>

          {/* Findings Table */}
          {result.findings && result.findings.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discovered Holdings</CardTitle>
                    <CardDescription>
                      Review findings and approve for database inclusion
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Exchange
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          BTC Holdings
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.findings.map((finding, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={selectedFindings.has(index)}
                              onCheckedChange={() => toggleFinding(index)}
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {finding.company.name}
                              </div>
                              <div className="text-sm text-gray-500 font-mono">
                                {finding.company.ticker}
                              </div>
                              {finding.company.nameLocal && (
                                <div className="text-xs text-gray-400">
                                  {finding.company.nameLocal}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className={getExchangeColor(finding.company.exchange)}>
                              {finding.company.exchange}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {finding.bitcoin.totalHoldings?.toLocaleString()} BTC
                              </div>
                              {finding.bitcoin.costBasis && (
                                <div className="text-xs text-gray-500">
                                  ${(finding.bitcoin.costBasis / 1000000).toFixed(1)}M cost
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {finding.disclosure.date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(finding.disclosure.date).toLocaleDateString()}
                              </div>
                            ) : (
                              'Unknown'
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Badge className={getConfidenceBadge(finding.metadata.confidence)}>
                                {finding.metadata.confidence}%
                              </Badge>
                              {finding.disclosure.verified && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
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
                <p className="text-gray-500">No new Bitcoin treasury holdings found in this search.</p>
                <p className="text-sm text-gray-400 mt-2">
                  This could mean all findings were duplicates or no new announcements were discovered.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top Holdings Summary */}
          {result.summary?.topHoldings && result.summary.topHoldings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Bitcoin Holdings Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.summary.topHoldings.map((holding, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-blue-${600 - index * 100} text-white flex items-center justify-center font-bold text-sm`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{holding.company}</div>
                          <div className="text-sm text-gray-500 font-mono">{holding.ticker}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{holding.btc.toLocaleString()} BTC</div>
                        <div className="text-sm text-gray-500">
                          ${((holding.btc * 95000) / 1000000).toFixed(1)}M @ $95K
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exchange Distribution */}
          {result.summary?.byExchange && Object.keys(result.summary.byExchange).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribution by Exchange</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(result.summary.byExchange).map(([exchange, count]) => (
                    <div key={exchange} className="text-center p-3 bg-gray-50 rounded-lg">
                      <Badge className={`${getExchangeColor(exchange)} mb-2`}>
                        {exchange}
                      </Badge>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-gray-500">companies</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          {result.nextSteps && result.nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions */}
      {!result && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                Click "Run Dynamic Update" to search for recent Bitcoin treasury announcements
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                Review the findings - each shows company info, BTC holdings, and confidence score
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                Select findings you want to add to your database
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                Click "Approve Selected" to save them
              </li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> The scanner searches HKEX, Shanghai, Shenzhen, Tokyo, Korea, Singapore, and Australian exchanges for Bitcoin-related announcements in multiple languages.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">1. Deploy the Edge Function</h4>
              <code className="block bg-gray-100 p-2 rounded">
                supabase functions deploy dynamic-data-updater --no-verify-jwt
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">2. Set Environment Variables</h4>
              <code className="block bg-gray-100 p-2 rounded">
                supabase secrets set PERPLEXITY_API_KEY=your-key<br />
                supabase secrets set FIRECRAWL_API_KEY=your-key
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">3. Schedule Regular Updates</h4>
              <p className="mb-2">Run every 6 hours:</p>
              <code className="block bg-gray-100 p-2 rounded">
                SELECT cron.schedule('scan-asia-bitcoin', '0 */6 * * *', $$...$$);
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}