import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exerciseName } = body;

    if (!exerciseName) {
      return NextResponse.json({ error: 'Exercise name required' }, { status: 400 });
    }

    // SVG stick figure
    const name = (exerciseName || 'Exercise').toUpperCase().slice(0, 15);
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#10B981" width="400" height="400"/>
      <circle cx="200" cy="100" r="35" fill="white"/>
      <line x1="200" y1="135" x2="200" y2="250" stroke="white" stroke-width="10" stroke-linecap="round"/>
      <line x1="200" y1="170" x2="150" y2="210" stroke="white" stroke-width="8" stroke-linecap="round"/>
      <line x1="200" y1="170" x2="250" y2="210" stroke="white" stroke-width="8" stroke-linecap="round"/>
      <line x1="200" y1="250" x2="170" y2="340" stroke="white" stroke-width="8" stroke-linecap="round"/>
      <line x1="200" y1="250" x2="230" y2="340" stroke="white" stroke-width="8" stroke-linecap="round"/>
      <text x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="bold">${name}</text>
    </svg>`;
    
    const base64 = Buffer.from(svgContent).toString('base64');
    return NextResponse.json({ imageUrl: `data:image/svg+xml;base64,${base64}` });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
