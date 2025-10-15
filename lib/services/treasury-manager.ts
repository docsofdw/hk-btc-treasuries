import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseHelpers, ValidationSchemas } from './database-helpers';
import { monitoring } from './monitoring';

export class TreasuryManager {
  private supabase: SupabaseClient;
  private dbHelpers: DatabaseHelpers;
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.dbHelpers = new DatabaseHelpers(supabaseClient);
  }
  
  async addOrUpdateEntity(data: {
    ticker: string
    legalName: string
    btc: number
    costBasisUsd?: number
    sourceUrl: string
    lastDisclosed: string
    exchange?: string
  }) {
    // Validate input (only validate sourceUrl if it's provided)
    const validationData: Record<string, unknown> = { 
      ticker: data.ticker, 
      legalName: data.legalName 
    };
    const validationSchema: Record<string, RegExp> = { 
      ticker: ValidationSchemas.ticker,
      legalName: ValidationSchemas.entityName
    };
    
    // Only validate URL if it's provided and not empty
    if (data.sourceUrl && data.sourceUrl.trim() !== '') {
      validationData.sourceUrl = data.sourceUrl;
      validationSchema.sourceUrl = ValidationSchemas.url;
    }
    
    const validated = this.dbHelpers.validateInput(validationData, validationSchema);
    
    if (data.btc < 0) {
      throw new Error('BTC amount cannot be negative');
    }
    
    return await monitoring.trackPerformance(
      'add_or_update_entity',
      async () => {
        // Enhanced duplicate detection - check by ticker AND company name
        const existingEntity = await this.findExistingEntity(
          validated.ticker as string, 
          validated.legalName as string
        );
        
        let entityId = existingEntity?.id;
        
        if (!entityId) {
          // Create new entity with sanitized data
          const { data: newEntity, error: createError } = await this.supabase
            .from('entities')
            .insert({
              legal_name: this.dbHelpers.sanitizeText(validated.legalName as string),
              ticker: validated.ticker as string,
              listing_venue: data.exchange || this.determineVenue(validated.ticker as string),
              hq: 'TBD',
              region: this.determineRegion(validated.ticker as string)
            })
            .select()
            .single();
          
          if (createError) throw createError;
          entityId = newEntity.id;
          
          monitoring.info('treasury-manager', 'Created new entity', { 
            ticker: validated.ticker,
            entityId 
          });
        } else {
          // Update entity name if it has changed
          const { error: updateError } = await this.supabase
            .from('entities')
            .update({
              legal_name: this.dbHelpers.sanitizeText(validated.legalName as string)
            })
            .eq('id', entityId);
          
          if (updateError) throw updateError;
          
          monitoring.info('treasury-manager', 'Updated entity name', { 
            ticker: validated.ticker,
            entityId,
            newName: validated.legalName
          });
        }
        
        // Add holding snapshot
        const { error: snapshotError } = await this.supabase
          .from('holdings_snapshots')
          .insert({
            entity_id: entityId,
            btc: data.btc,
            cost_basis_usd: data.costBasisUsd,
            last_disclosed: data.lastDisclosed,
            source_url: validated.sourceUrl as string || data.sourceUrl || '',
            data_source: 'manual'
          });
        
        if (snapshotError) throw snapshotError;
        
        // Create audit log
        await this.dbHelpers.createAuditLog({
          action: existingEntity ? 'update_entity' : 'create_entity',
          entity_id: entityId,
          details: {
            ticker: validated.ticker,
            btc: data.btc,
            source: validated.sourceUrl
          }
        });
        
        return { success: true, entityId };
      },
      { ticker: data.ticker }
    );
  }

  /**
   * Enhanced method to find existing entities by ticker OR similar company name
   */
  private async findExistingEntity(ticker: string, legalName: string): Promise<{ id: string; legal_name: string; ticker: string } | null> {
    // First, check by exact ticker match
    const { data: byTicker } = await this.supabase
      .from('entities')
      .select('*')
      .eq('ticker', ticker)
      .single();
    
    if (byTicker) {
      monitoring.info('treasury-manager', 'Found existing entity by ticker', { 
        ticker, 
        existingName: byTicker.legal_name 
      });
      return byTicker;
    }
    
    // Then, check by similar company name (fuzzy matching)
    const { data: allEntities } = await this.supabase
      .from('entities')
      .select('*');
    
    if (allEntities) {
      // Check for exact name match (case insensitive)
      const exactNameMatch = allEntities.find(entity => 
        entity.legal_name.toLowerCase() === legalName.toLowerCase()
      );
      
      if (exactNameMatch) {
        monitoring.info('treasury-manager', 'Found existing entity by exact name', { 
          inputName: legalName,
          existingTicker: exactNameMatch.ticker,
          existingName: exactNameMatch.legal_name
        });
        return exactNameMatch;
      }
      
      // Check for similar names (fuzzy matching)
      const similarEntity = allEntities.find(entity => {
        const similarity = this.calculateNameSimilarity(legalName, entity.legal_name);
        return similarity > 0.8; // 80% similarity threshold
      });
      
      if (similarEntity) {
        monitoring.info('treasury-manager', 'Found similar entity by name', { 
          inputName: legalName,
          similarName: similarEntity.legal_name,
          similarTicker: similarEntity.ticker,
          similarity: this.calculateNameSimilarity(legalName, similarEntity.legal_name)
        });
        
        // Log a warning about potential duplicate
        console.warn(`⚠️ Potential duplicate detected:
          Input: "${legalName}" (${ticker})
          Existing: "${similarEntity.legal_name}" (${similarEntity.ticker})
          Similarity: ${(this.calculateNameSimilarity(legalName, similarEntity.legal_name) * 100).toFixed(1)}%
          Consider manual review.`);
        
        return similarEntity;
      }
    }
    
    return null;
  }

  /**
   * Calculate similarity between two company names using Levenshtein distance
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // Normalize names for comparison
    const normalize = (name: string) => name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim();
    
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    if (n1 === n2) return 1.0;
    
    // Calculate Levenshtein distance
    const matrix = Array(n1.length + 1).fill(null).map(() => Array(n2.length + 1).fill(null));
    
    for (let i = 0; i <= n1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= n2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= n1.length; i++) {
      for (let j = 1; j <= n2.length; j++) {
        const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    const distance = matrix[n1.length][n2.length];
    const maxLength = Math.max(n1.length, n2.length);
    
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }
  
  async getAllEntities() {
    const { data, error } = await this.supabase
      .from('entities')
      .select(`
        *,
        holdings_snapshots (
          btc,
          cost_basis_usd,
          last_disclosed,
          source_url,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform to match our TreasuryEntity type
    return data?.map(entity => ({
      id: entity.id,
      legalName: entity.legal_name,
      ticker: entity.ticker,
      listingVenue: entity.listing_venue,
      hq: entity.hq,
      btc: entity.holdings_snapshots?.[0]?.btc || 0,
      costBasisUsd: entity.holdings_snapshots?.[0]?.cost_basis_usd,
      lastDisclosed: entity.holdings_snapshots?.[0]?.last_disclosed,
      source: entity.holdings_snapshots?.[0]?.source_url,
      dataSource: 'manual' as const,
      region: entity.region
    }))
  }
  
  private determineVenue(ticker: string): string {
    if (ticker.includes('.HK')) return 'HKEX'
    if (ticker.includes('.SZ')) return 'SZSE'
    if (ticker.includes('.SH')) return 'SSE'
    return 'NASDAQ'
  }
  
  private determineRegion(ticker: string): string {
    if (ticker.includes('.HK')) return 'HK'
    return 'China'
  }
} 