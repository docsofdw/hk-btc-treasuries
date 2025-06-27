const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDatabase() {
  console.log('🔍 Checking Bitcoin Treasuries Database Status')
  console.log('=' .repeat(50))
  
  try {
    // Check entities
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, legal_name, ticker, listing_venue, region')
      .order('legal_name')
    
    if (entitiesError) throw entitiesError
    
    console.log(`\n📊 Entities: ${entities?.length || 0} total`)
    entities?.slice(0, 5).forEach((entity, i) => {
      console.log(`  ${i+1}. ${entity.legal_name} (${entity.ticker}) - ${entity.listing_venue}`)
    })
    if (entities && entities.length > 5) {
      console.log(`  ... and ${entities.length - 5} more`)
    }
    
    // Check raw filings
    const { data: filings, error: filingsError } = await supabase
      .from('raw_filings')
      .select(`
        id, 
        btc, 
        btc_delta,
        btc_total,
        detected_in,
        disclosed_at, 
        source, 
        filing_type,
        verified,
        entities(legal_name, ticker)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (filingsError) throw filingsError
    
    console.log(`\n📄 Recent Filings: ${filings?.length || 0} shown (latest 10)`)
    filings?.forEach((filing, i) => {
      const entity = filing.entities
      const badge = filing.verified ? '✅' : filing.detected_in === 'body' ? '📄' : filing.detected_in === 'manual' ? '✋' : '📋'
      console.log(`  ${i+1}. ${badge} ${entity?.legal_name || 'Unknown'} (${entity?.ticker || 'N/A'})`)
      console.log(`     ${filing.btc} BTC | ${filing.source} | ${filing.filing_type || 'unknown'} | ${filing.disclosed_at?.split('T')[0]}`)
      if (filing.btc_delta) console.log(`     Delta: ${filing.btc_delta} BTC`)
      if (filing.btc_total) console.log(`     Total: ${filing.btc_total} BTC`)
    })
    
    // Check data quality report if it exists
    try {
      const { data: quality, error: qualityError } = await supabase
        .from('data_quality_report')
        .select('*')
      
      if (!qualityError && quality) {
        console.log(`\n📈 Data Quality Report:`)
        quality.forEach(row => {
          console.log(`  ${row.table_name}:`)
          console.log(`    Total records: ${row.total_records}`)
          console.log(`    Verified: ${row.verified_records}`)
          console.log(`    Parsed: ${row.parsed_records}`)
          console.log(`    Title only: ${row.title_only_records}`)
          console.log(`    Avg age: ${Math.round(row.avg_age_days)} days`)
        })
      }
    } catch (e) {
      console.log(`\n⚠️  Data quality report not available yet`)
    }
    
    // Check entity holdings view if it exists
    try {
      const { data: holdings, error: holdingsError } = await supabase
        .from('entity_btc_holdings')
        .select('legal_name, ticker, current_btc_holdings, total_filings, verified_filings')
        .order('current_btc_holdings', { ascending: false })
        .limit(5)
      
      if (!holdingsError && holdings) {
        console.log(`\n🏆 Top Bitcoin Holdings:`)
        holdings.forEach((holding, i) => {
          console.log(`  ${i+1}. ${holding.legal_name} (${holding.ticker})`)
          console.log(`     Holdings: ${holding.current_btc_holdings} BTC`)
          console.log(`     Filings: ${holding.verified_filings}/${holding.total_filings} verified`)
        })
      }
    } catch (e) {
      console.log(`\n⚠️  Holdings view not available yet`)
    }
    
    console.log(`\n✅ Database check completed!`)
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message)
  }
}

checkDatabase() 