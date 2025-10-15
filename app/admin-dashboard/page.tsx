'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Clock,
  Activity,
  Zap,
  Eye,
  Download,
  FileText,
  Target,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronRight,
  Monitor,
  Cog
} from 'lucide-react';

interface AdminStats {
  totalCompanies: number;
  totalBTC: number;
  lastScanTime: string;
  pendingApprovals: number;
  scansToday: number;
  systemHealth: {
    scraperStatus: 'active' | 'idle' | 'error';
    apiLimits: { used: number; total: number; service: string }[];
    lastErrors: string[];
  };
  recentActivity: {
    timestamp: string;
    action: string;
    details: string;
    status: 'success' | 'warning' | 'error';
  }[];
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

export default function EnhancedAdminDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<number>>(new Set());
  const [processingApproval, setProcessingApproval] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [filteredFindings, setFilteredFindings] = useState<ScanResult['findings']>([]);
  const [confidenceFilter, setConfidenceFilter] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Load admin stats on component mount
  useEffect(() => {
    loadAdminStats();
    const autoScan = localStorage.getItem('autoScanEnabled') === 'true';
    setAutoScanEnabled(autoScan);
  }, []);

  const loadAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        setAdminStats({
          ...stats,
          systemHealth: {
            scraperStatus: 'active',
            apiLimits: [
              { service: 'Perplexity', used: 45, total: 100 },
              { service: 'Firecrawl', used: 23, total: 50 },
              { service: 'HKEX API', used: 156, total: 200 }
            ],
            lastErrors: []
          },
          recentActivity: [
            {
              timestamp: new Date().toISOString(),
              action: 'Scan Completed',
              details: 'Found 3 new companies with Bitcoin holdings',
              status: 'success'
            },
            {
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              action: 'Market Data Update',
              details: 'Updated BTC prices for all entities',
              status: 'success'
            }
          ]
        });
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
    setScanProgress(0);

    try {
      // Simulate progress updates during scan
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 1000);

      const response = await fetch('/api/admin/dynamic-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Scan failed');
      }
      
      setScanResult(data);
      setFilteredFindings(data.findings || []);
      await loadAdminStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(0), 2000);
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
      await loadAdminStats();
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

  const filterFindings = (findings: ScanResult['findings'], minConfidence: number) => {
    return findings.filter(f => (f.metadata?.confidence || 0) >= minConfidence);
  };

  useEffect(() => {
    if (scanResult?.findings) {
      setFilteredFindings(filterFindings(scanResult.findings, confidenceFilter));
    }
  }, [scanResult, confidenceFilter]);

  const toggleFindingDetails = (index: number) => {
    setExpandedFinding(expandedFinding === index ? null : index);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Enhanced Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Bitcoin Treasury Admin
            </h1>
            <p className="text-gray-600">
              Advanced dashboard for Asia-Pacific Bitcoin treasury discovery and management
            </p>
          </div>
          <div className="flex items-center gap-2">
            {adminStats?.systemHealth.scraperStatus === 'active' && (
              <Badge className="bg-green-100 text-green-800">
                <Activity className="w-3 h-3 mr-1" />
                System Active
              </Badge>
            )}
            <Button
              onClick={loadAdminStats}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="scan">Scan Results</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Enhanced Quick Stats */}
          {adminStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Building className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold">{adminStats.totalCompanies}</span>
                  </div>
                  <p className="text-sm text-gray-600">Companies Tracked</p>
                  <div className="text-xs text-gray-400 mt-1">Active monitoring</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Hash className="w-6 h-6 text-orange-600" />
                    <span className="text-2xl font-bold">{adminStats.totalBTC.toFixed(0)}</span>
                  </div>
                  <p className="text-sm text-gray-600">Total BTC</p>
                  <div className="text-xs text-gray-400 mt-1">${(adminStats.totalBTC * 45000).toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-bold">{adminStats.lastScanTime || 'Never'}</span>
                  </div>
                  <p className="text-sm text-gray-600">Last Scan</p>
                  <div className="text-xs text-gray-400 mt-1">Auto: {autoScanEnabled ? 'ON' : 'OFF'}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-6 h-6 text-yellow-600" />
                    <span className="text-2xl font-bold">{adminStats.pendingApprovals}</span>
                  </div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <div className="text-xs text-gray-400 mt-1">Awaiting approval</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="w-6 h-6 text-purple-600" />
                    <span className="text-2xl font-bold">{adminStats.scansToday}</span>
                  </div>
                  <p className="text-sm text-gray-600">Scans Today</p>
                  <div className="text-xs text-gray-400 mt-1">API calls made</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          {adminStats?.recentActivity && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {adminStats.recentActivity.slice(0, 10).map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        {getStatusIcon(activity.status)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.details}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Quick Start Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg mb-3">Getting Started</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Switch to Scan Tab</h4>
                      <p className="text-sm text-gray-600">Navigate to the "Scan Results" tab to run manual scans</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Run AI Discovery</h4>
                      <p className="text-sm text-gray-600">Click "Run AI Discovery Scan" to search for new Bitcoin holdings</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-medium">Review and Filter</h4>
                      <p className="text-sm text-gray-600">Use confidence filters and expand findings for detailed review</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-lg mb-3">Advanced Features</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-medium">Monitor System Health</h4>
                      <p className="text-sm text-gray-600">Check the "Monitoring" tab for API usage and system status</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">5</div>
                    <div>
                      <h4 className="font-medium">Enable Automation</h4>
                      <p className="text-sm text-gray-600">Configure auto-scanning in the "Automation" tab for continuous discovery</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-6">
          {/* Enhanced Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Scanning Controls
              </CardTitle>
              <CardDescription>
                Execute scans and manage discovery operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                        Run AI Discovery Scan
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
                </div>

                {/* Scan Progress */}
                {isScanning && scanProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Scan Progress</span>
                      <span>{Math.round(scanProgress)}%</span>
                    </div>
                    <Progress value={scanProgress} className="w-full" />
                  </div>
                )}

                {/* Quick Stats for Current Tab */}
                {scanResult && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Search className="w-6 h-6 text-blue-600" />
                          <span className="text-2xl font-bold">{scanResult.stats.searchesPerformed}</span>
                        </div>
                        <p className="text-sm text-gray-600">Searches</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Globe className="w-6 h-6 text-green-600" />
                          <span className="text-2xl font-bold">{scanResult.stats.totalFindings}</span>
                        </div>
                        <p className="text-sm text-gray-600">Total Found</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="w-6 h-6 text-purple-600" />
                          <span className="text-2xl font-bold">{scanResult.stats.uniqueFindings}</span>
                        </div>
                        <p className="text-sm text-gray-600">New Discoveries</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Hash className="w-6 h-6 text-orange-600" />
                          <span className="text-2xl font-bold">
                            {scanResult.summary?.totalBitcoinFound?.toFixed(0) || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">BTC Found</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Findings Display */}
          {scanResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Discovery Results
                    </CardTitle>
                    <CardDescription>
                      {filteredFindings.length} findings (filtered by {confidenceFilter}% minimum confidence)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm">Min Confidence:</span>
                      <select
                        value={confidenceFilter}
                        onChange={(e) => setConfidenceFilter(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={0}>All</option>
                        <option value={50}>50%+</option>
                        <option value={70}>70%+</option>
                        <option value={80}>80%+</option>
                      </select>
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
                </div>
              </CardHeader>
              <CardContent>
                {filteredFindings && filteredFindings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredFindings.map((finding, index) => (
                      <Card key={index} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={selectedFindings.has(index)}
                              onCheckedChange={() => toggleFinding(index)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h3 className="font-medium text-lg">{finding.company.name}</h3>
                                  {finding.company.nameLocal && (
                                    <p className="text-sm text-gray-500">{finding.company.nameLocal}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={getExchangeColor(finding.company.exchange)}>
                                      {finding.company.exchange}
                                    </Badge>
                                    <span className="text-sm font-mono text-gray-600">{finding.company.ticker}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleFindingDetails(index)}
                                >
                                  {expandedFinding === index ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                  <p className="text-sm text-gray-500">Bitcoin Holdings</p>
                                  <p className="font-bold text-lg">
                                    {finding.bitcoin.totalHoldings?.toLocaleString()} BTC
                                  </p>
                                  {finding.bitcoin.costBasis && (
                                    <p className="text-sm text-gray-600">
                                      ${finding.bitcoin.costBasis.toLocaleString()} cost basis
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Confidence Score</p>
                                  <Badge className={getConfidenceBadge(finding.metadata.confidence)}>
                                    {finding.metadata.confidence}%
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Source</p>
                                  {finding.disclosure.url ? (
                                    <a
                                      href={finding.disclosure.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View Filing
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No URL</span>
                                  )}
                                </div>
                              </div>
                              
                              {expandedFinding === index && (
                                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <strong>Search Query:</strong> {finding.metadata.query}
                                    </div>
                                    <div>
                                      <strong>Source Type:</strong> {finding.metadata.source}
                                    </div>
                                    {finding.disclosure.date && (
                                      <div>
                                        <strong>Disclosure Date:</strong> {finding.disclosure.date}
                                      </div>
                                    )}
                                    {finding.bitcoin.averagePrice && (
                                      <div>
                                        <strong>Avg Price:</strong> ${finding.bitcoin.averagePrice.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <strong>Verified:</strong> {finding.disclosure.verified ? 'Yes' : 'No'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-500">No findings match current filters</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Try lowering the confidence threshold or run a new scan
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* System Health */}
          {adminStats?.systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Scraper Status</span>
                      <Badge className={
                        adminStats.systemHealth.scraperStatus === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : adminStats.systemHealth.scraperStatus === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {adminStats.systemHealth.scraperStatus.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {adminStats.systemHealth.lastErrors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">Recent Errors:</p>
                        <div className="space-y-1">
                          {adminStats.systemHealth.lastErrors.slice(0, 3).map((error, i) => (
                            <p key={i} className="text-xs text-red-500 bg-red-50 p-2 rounded">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    API Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats.systemHealth.apiLimits.map((limit, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{limit.service}</span>
                          <span>{limit.used}/{limit.total}</span>
                        </div>
                        <Progress value={(limit.used / limit.total) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          {/* Automation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automated scanning and data collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Auto Discovery Scan</h3>
                    <p className="text-sm text-gray-500">Run AI-powered discovery every 6 hours</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-discovery"
                      checked={autoScanEnabled}
                      onCheckedChange={toggleAutoScan}
                    />
                    {autoScanEnabled ? (
                      <PlayCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <PauseCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Configure Search Queries
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Export Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}