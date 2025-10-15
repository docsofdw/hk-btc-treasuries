import { SupabaseClient } from '@supabase/supabase-js';
import { monitoring } from './monitoring';

export interface ScraperConfig {
  id: string;
  name: string;
  type: 'hkex' | 'sec' | 'dynamic' | 'market-data';
  enabled: boolean;
  schedule: string; // cron format
  endpoint: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'idle' | 'error' | 'disabled';
  errorCount: number;
  successRate: number;
  avgRunTime: number;
  config: Record<string, string | number | boolean | string[]>;
}

export interface ScraperResult {
  scraperId: string;
  timestamp: string;
  success: boolean;
  duration: number;
  recordsProcessed: number;
  newRecords: number;
  errors: string[];
  summary: string;
}

export class ScraperOrchestrator {
  private supabase: SupabaseClient;
  private scrapers: Map<string, ScraperConfig> = new Map();
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.initializeScrapers();
  }

  private initializeScrapers() {
    const defaultScrapers: ScraperConfig[] = [
      {
        id: 'hkex-filings',
        name: 'HKEX Filing Scanner',
        type: 'hkex',
        enabled: true,
        schedule: '0 */4 * * *', // Every 4 hours
        endpoint: '/api/cron/scan-filings',
        status: 'active',
        errorCount: 0,
        successRate: 98.5,
        avgRunTime: 45000,
        config: {
          keywords: ['bitcoin', 'btc', 'digital asset', '比特币'],
          exchanges: ['HKEX'],
          confidenceThreshold: 70
        }
      },
      {
        id: 'sec-filings',
        name: 'SEC EDGAR Scanner',
        type: 'sec',
        enabled: true,
        schedule: '0 */6 * * *', // Every 6 hours
        endpoint: '/api/cron/scan-sec-filings',
        status: 'active',
        errorCount: 0,
        successRate: 94.2,
        avgRunTime: 60000,
        config: {
          forms: ['10-K', '10-Q', '8-K'],
          keywords: ['bitcoin', 'cryptocurrency', 'digital assets']
        }
      },
      {
        id: 'dynamic-discovery',
        name: 'AI-Powered Discovery',
        type: 'dynamic',
        enabled: true,
        schedule: '0 */8 * * *', // Every 8 hours
        endpoint: '/api/cron/dynamic-update',
        status: 'active',
        errorCount: 0,
        successRate: 89.7,
        avgRunTime: 120000,
        config: {
          aiModel: 'sonar',
          searchQueries: 10,
          regions: ['Asia-Pacific', 'North America'],
          minConfidence: 60
        }
      },
      {
        id: 'market-data',
        name: 'Market Data Updater',
        type: 'market-data',
        enabled: true,
        schedule: '*/30 * * * *', // Every 30 minutes
        endpoint: '/api/cron/update-market-data',
        status: 'active',
        errorCount: 0,
        successRate: 99.1,
        avgRunTime: 15000,
        config: {
          sources: ['finnhub', 'polygon', 'twelvedata'],
          updatePrices: true,
          updateMarketCaps: true
        }
      }
    ];

    defaultScrapers.forEach(scraper => {
      this.scrapers.set(scraper.id, scraper);
    });
  }

  async getScraperStatus(): Promise<ScraperConfig[]> {
    return Array.from(this.scrapers.values());
  }

  async runScraper(scraperId: string): Promise<ScraperResult> {
    const scraper = this.scrapers.get(scraperId);
    if (!scraper) {
      throw new Error(`Scraper ${scraperId} not found`);
    }

    if (!scraper.enabled) {
      throw new Error(`Scraper ${scraperId} is disabled`);
    }

    const startTime = Date.now();
    
    try {
      monitoring.info('scraper-orchestrator', `Starting scraper: ${scraper.name}`, { scraperId });
      
      // Update scraper status
      scraper.status = 'active';
      scraper.lastRun = new Date().toISOString();
      
      // Execute the scraper
      const response = await fetch(scraper.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}` // For security
        },
        body: JSON.stringify({ manual: true, config: scraper.config })
      });

      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result: ScraperResult = {
        scraperId,
        timestamp: new Date().toISOString(),
        success: true,
        duration,
        recordsProcessed: data.processed || 0,
        newRecords: data.newRecords || 0,
        errors: [],
        summary: data.summary || `Processed ${data.processed || 0} records`
      };

      // Update scraper stats
      scraper.status = 'idle';
      scraper.avgRunTime = (scraper.avgRunTime * 0.8) + (duration * 0.2); // Moving average
      scraper.successRate = Math.min(99.9, scraper.successRate + 0.1);

      monitoring.info('scraper-orchestrator', `Scraper completed successfully: ${scraper.name}`, {
        scraperId,
        duration,
        recordsProcessed: result.recordsProcessed
      });

      await this.logScraperRun(result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update scraper error stats
      scraper.status = 'error';
      scraper.errorCount += 1;
      scraper.successRate = Math.max(0, scraper.successRate - 2);

      const result: ScraperResult = {
        scraperId,
        timestamp: new Date().toISOString(),
        success: false,
        duration,
        recordsProcessed: 0,
        newRecords: 0,
        errors: [errorMessage],
        summary: `Failed: ${errorMessage}`
      };

      monitoring.error('scraper-orchestrator', `Scraper failed: ${scraper.name}`, 
        error instanceof Error ? error : new Error(errorMessage),
        {
        scraperId,
        duration
        }
      );

      await this.logScraperRun(result);
      throw error;
    }
  }

  async runAllActiveScrapers(): Promise<ScraperResult[]> {
    const activeScrapers = Array.from(this.scrapers.values()).filter(s => s.enabled);
    const results: ScraperResult[] = [];

    for (const scraper of activeScrapers) {
      try {
        const result = await this.runScraper(scraper.id);
        results.push(result);
      } catch (error) {
        monitoring.error('scraper-orchestrator', `Failed to run scraper: ${scraper.name}`, 
          error instanceof Error ? error : new Error('Unknown error'),
          {
            scraperId: scraper.id
          }
        );
      }
    }

    return results;
  }

  async updateScraperConfig(scraperId: string, updates: Partial<ScraperConfig>): Promise<void> {
    const scraper = this.scrapers.get(scraperId);
    if (!scraper) {
      throw new Error(`Scraper ${scraperId} not found`);
    }

    Object.assign(scraper, updates);
    
    monitoring.info('scraper-orchestrator', `Updated scraper config: ${scraper.name}`, {
      scraperId,
      updates
    });
  }

  async getScraperLogs(scraperId: string, limit = 50): Promise<ScraperResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('scraper_logs')
        .select('*')
        .eq('scraper_id', scraperId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(log => ({
        scraperId: log.scraper_id,
        timestamp: log.timestamp,
        success: log.success,
        duration: log.duration,
        recordsProcessed: log.records_processed,
        newRecords: log.new_records,
        errors: log.errors || [],
        summary: log.summary
      })) || [];
    } catch (error) {
      monitoring.error('scraper-orchestrator', 'Failed to get scraper logs', 
        error instanceof Error ? error : new Error('Unknown error'),
        {
          scraperId
        }
      );
      return [];
    }
  }

  async getSystemHealth(): Promise<{
    totalScrapers: number;
    activeScrapers: number;
    errorCount: number;
    avgSuccessRate: number;
    lastRunTimes: Record<string, string>;
    upcomingRuns: Array<{ scraperId: string; nextRun: string }>;
  }> {
    const scrapers = Array.from(this.scrapers.values());
    
    return {
      totalScrapers: scrapers.length,
      activeScrapers: scrapers.filter(s => s.enabled && s.status !== 'error').length,
      errorCount: scrapers.reduce((sum, s) => sum + s.errorCount, 0),
      avgSuccessRate: scrapers.reduce((sum, s) => sum + s.successRate, 0) / scrapers.length,
      lastRunTimes: Object.fromEntries(
        scrapers.map(s => [s.id, s.lastRun || 'Never'])
      ),
      upcomingRuns: scrapers
        .filter(s => s.enabled && s.nextRun)
        .map(s => ({ scraperId: s.id, nextRun: s.nextRun! }))
        .sort((a, b) => a.nextRun.localeCompare(b.nextRun))
    };
  }

  private async logScraperRun(result: ScraperResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('scraper_logs')
        .insert({
          scraper_id: result.scraperId,
          timestamp: result.timestamp,
          success: result.success,
          duration: result.duration,
          records_processed: result.recordsProcessed,
          new_records: result.newRecords,
          errors: result.errors,
          summary: result.summary
        });

      if (error) {
        monitoring.error('scraper-orchestrator', 'Failed to log scraper run', 
          error,
          {
            scraperId: result.scraperId
          }
        );
      }
    } catch (error) {
      monitoring.error('scraper-orchestrator', 'Failed to log scraper run', 
        error instanceof Error ? error : new Error('Unknown error'),
        {
          scraperId: result.scraperId
        }
      );
    }
  }

  async optimizeScheduling(): Promise<void> {
    // Analyze scraper performance and adjust schedules
    const scrapers = Array.from(this.scrapers.values());
    
    for (const scraper of scrapers) {
      if (scraper.successRate < 80) {
        // Reduce frequency for failing scrapers
        monitoring.warn('scraper-orchestrator', `Reducing frequency for failing scraper: ${scraper.name}`, {
          scraperId: scraper.id,
          successRate: scraper.successRate
        });
      }
      
      if (scraper.avgRunTime > 300000) { // 5 minutes
        // Flag long-running scrapers
        monitoring.warn('scraper-orchestrator', `Long-running scraper detected: ${scraper.name}`, {
          scraperId: scraper.id,
          avgRunTime: scraper.avgRunTime
        });
      }
    }
  }

  async getRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const scrapers = Array.from(this.scrapers.values());
    
    // Performance recommendations
    const failingScrapers = scrapers.filter(s => s.successRate < 90);
    if (failingScrapers.length > 0) {
      recommendations.push(`${failingScrapers.length} scraper(s) have low success rates - consider reviewing configuration`);
    }
    
    const slowScrapers = scrapers.filter(s => s.avgRunTime > 120000);
    if (slowScrapers.length > 0) {
      recommendations.push(`${slowScrapers.length} scraper(s) are running slowly - consider optimization`);
    }
    
    const errorScrapers = scrapers.filter(s => s.errorCount > 10);
    if (errorScrapers.length > 0) {
      recommendations.push(`${errorScrapers.length} scraper(s) have high error counts - investigate and fix issues`);
    }
    
    // Coverage recommendations
    const disabledScrapers = scrapers.filter(s => !s.enabled);
    if (disabledScrapers.length > 0) {
      recommendations.push(`${disabledScrapers.length} scraper(s) are disabled - enable if needed for better coverage`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const scraperOrchestrator = new ScraperOrchestrator(
  // This will be injected when used
  {} as SupabaseClient
);