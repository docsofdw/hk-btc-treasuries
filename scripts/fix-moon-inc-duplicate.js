const { createClient } = require('@supabase/supabase-js');

async function fixMoonIncDuplicate() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔍 Finding Moon Inc. entities...');
    
    // Find all Moon Inc. entities
    const { data: moonEntities, error: findError } = await supabase
      .from('entities')
      .select('*')
      .ilike('legal_name', '%Moon Inc%');
    
    if (findError) throw findError;
    
    console.log('Found Moon Inc. entities:', moonEntities);
    
    if (moonEntities.length < 2) {
      console.log('✅ No duplicates found for Moon Inc.');
      return;
    }
    
    // Identify which one to keep (1723.HK) and which to remove (MOON.HK)
    const correctEntity = moonEntities.find(entity => entity.ticker === '1723.HK');
    const duplicateEntity = moonEntities.find(entity => entity.ticker === 'MOON.HK');
    
    if (!correctEntity) {
      console.log('❌ Could not find Moon Inc. with ticker 1723.HK');
      return;
    }
    
    if (!duplicateEntity) {
      console.log('✅ No duplicate Moon Inc. with MOON.HK ticker found');
      return;
    }
    
    console.log('📋 Correct entity (keeping):', correctEntity);
    console.log('🗑️ Duplicate entity (removing):', duplicateEntity);
    
    // Get holdings snapshots for the duplicate
    const { data: duplicateHoldings, error: holdingsError } = await supabase
      .from('holdings_snapshots')
      .select('*')
      .eq('entity_id', duplicateEntity.id);
    
    if (holdingsError) throw holdingsError;
    
    console.log('📊 Holdings snapshots for duplicate:', duplicateHoldings);
    
    // Delete holdings snapshots for duplicate entity
    if (duplicateHoldings.length > 0) {
      const { error: deleteHoldingsError } = await supabase
        .from('holdings_snapshots')
        .delete()
        .eq('entity_id', duplicateEntity.id);
      
      if (deleteHoldingsError) throw deleteHoldingsError;
      console.log('✅ Deleted holdings snapshots for duplicate entity');
    }
    
    // Delete audit logs for duplicate entity
    const { error: deleteAuditError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('entity_id', duplicateEntity.id);
    
    if (deleteAuditError) {
      console.warn('⚠️ Could not delete audit logs:', deleteAuditError);
    }
    
    // Delete the duplicate entity
    const { error: deleteEntityError } = await supabase
      .from('entities')
      .delete()
      .eq('id', duplicateEntity.id);
    
    if (deleteEntityError) throw deleteEntityError;
    
    console.log('✅ Successfully removed duplicate Moon Inc. entity');
    console.log('✅ Kept Moon Inc. with ticker 1723.HK and HKEX exchange');
    
    // Create audit log for the cleanup
    await supabase
      .from('audit_logs')
      .insert({
        action: 'duplicate_cleanup',
        entity_id: correctEntity.id,
        details: {
          removed_duplicate_ticker: duplicateEntity.ticker,
          kept_ticker: correctEntity.ticker,
          cleanup_reason: 'Removed duplicate Moon Inc. entry'
        },
        timestamp: new Date().toISOString()
      });
    
    console.log('✅ Created audit log for cleanup');
    
  } catch (error) {
    console.error('❌ Error fixing Moon Inc. duplicate:', error);
    process.exit(1);
  }
}

// Run the script
fixMoonIncDuplicate().then(() => {
  console.log('🎉 Moon Inc. duplicate fix completed');
  process.exit(0);
}); 