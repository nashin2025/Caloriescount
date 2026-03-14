import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchFoodNutrition } from '@/lib/openfoodfacts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2 || query.length > 100) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchFoodNutrition(query);
    
    if (results) {
      return NextResponse.json({ results: [results] });
    }
    
    return NextResponse.json({ results: [] });
  } catch (error) {
    console.error('Food search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
