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
        // Check if entity exists
        const { data: existing } = await this.supabase
          .from('entities')
          .select('id')
          .eq('ticker', validated.ticker as string)
          .single();
        
        let entityId = existing?.id;
        
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
          action: existing ? 'update_entity' : 'create_entity',
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