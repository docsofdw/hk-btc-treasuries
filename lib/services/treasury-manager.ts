import { SupabaseClient } from '@supabase/supabase-js';

export class TreasuryManager {
  private supabase: SupabaseClient
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }
  
  async addOrUpdateEntity(data: {
    ticker: string
    legalName: string
    btc: number
    costBasisUsd?: number
    sourceUrl: string
    lastDisclosed: string
  }) {
    // Check if entity exists
    const { data: existing } = await this.supabase
      .from('entities')
      .select('id')
      .eq('ticker', data.ticker)
      .single()
    
    let entityId = existing?.id
    
    if (!entityId) {
      // Create new entity
      const { data: newEntity, error: createError } = await this.supabase
        .from('entities')
        .insert({
          legal_name: data.legalName,
          ticker: data.ticker,
          listing_venue: this.determineVenue(data.ticker),
          hq: 'TBD',
          region: this.determineRegion(data.ticker)
        })
        .select()
        .single()
      
      if (createError) throw createError
      entityId = newEntity.id
    }
    
    // Add holding snapshot
    const { error: snapshotError } = await this.supabase
      .from('holdings_snapshots')
      .insert({
        entity_id: entityId,
        btc: data.btc,
        cost_basis_usd: data.costBasisUsd,
        last_disclosed: data.lastDisclosed,
        source_url: data.sourceUrl,
        data_source: 'manual'
      })
    
    if (snapshotError) throw snapshotError
    
    return { success: true, entityId }
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