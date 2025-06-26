import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TreasuryManager } from '@/lib/services/treasury-manager';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hour cache

export async function GET() {
  try {
    const supabase = await createClient();
    const manager = new TreasuryManager(supabase);
    
    // First, check if we have any entities at all
    const entities = await manager.getAllEntities();
    
    if (!entities || entities.length === 0) {
      // If no entities, trigger the edge function to seed data
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      
      if (response.ok) {
        // Try getting entities again after seeding
        const seededEntities = await manager.getAllEntities();
        return NextResponse.json({ entities: seededEntities || [] }, {
          headers: {
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
          },
        });
      }
    }
    
    return NextResponse.json({ entities: entities || [] }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching treasuries:', error);
    
    // Return empty array instead of error to prevent UI from breaking
    return NextResponse.json(
      { entities: [] },
      { status: 200 }
    );
  }
} 