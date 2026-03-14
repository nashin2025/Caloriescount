import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const IS_XAI = GROQ_API_KEY?.startsWith('xai-');

async function getAIResponse(exerciseName: string): Promise<{
  instructions: string[];
  animation: string;
  tips: string[];
}> {
  const prompt = `For the exercise "${exerciseName}", provide:
1. A brief 2-3 sentence animation/description showing how to do the movement
2. Step-by-step instructions (4-6 steps)
3. 2-3 tips for proper form

Return ONLY valid JSON in this exact format:
{
  "animation": "2-3 sentence visual description of the movement",
  "instructions": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "tips": ["tip 1", "tip 2", "tip 3"]
}`;

  let response: string;
  
  if (IS_XAI) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          { role: 'system', content: 'You are a fitness expert. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });
    const data = await res.json();
    response = data.choices?.[0]?.message?.content || '{}';
  } else {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a fitness expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });
    response = completion.choices[0]?.message?.content || '{}';
  }

  const clean = response.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return {
      animation: `Demonstrating ${exerciseName} with proper form`,
      instructions: ['Start in proper position', 'Perform the movement', 'Hold briefly', 'Return to start', 'Repeat'],
      tips: ['Keep core engaged', 'Breathe steadily', 'Focus on form']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(getRateLimitIdentifier(user.id), 10, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { exerciseName } = body;

    if (!exerciseName) {
      return NextResponse.json({ error: 'Exercise name required' }, { status: 400 });
    }

    const result = await getAIResponse(exerciseName);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Exercise animation error:', error);
    return NextResponse.json({ error: 'Failed to get exercise info' }, { status: 500 });
  }
}
