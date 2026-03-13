import { NextRequest, NextResponse } from 'next/server';
import { searchFoodNutrition } from '@/lib/openfoodfacts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
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
