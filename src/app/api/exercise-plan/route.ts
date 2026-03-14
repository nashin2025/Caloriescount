import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('exercise_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading exercise plan:', error);
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error('Error loading exercise plan:', error);
    return NextResponse.json({ plan: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exercise_plans')
      .upsert({
        user_id: user.id,
        plan_data: plan,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving exercise plan:', error);
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: data });
  } catch (error) {
    console.error('Error saving exercise plan:', error);
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
  }
}
