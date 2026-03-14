import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const IS_XAI = GROQ_API_KEY?.startsWith('xai-');

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function getAIResponse(messages: AIMessage[]): Promise<string> {
  if (IS_XAI) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages,
        max_tokens: 2000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "{}";
  } else {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 2000,
    });
    return completion.choices[0]?.message?.content || "{}";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(getRateLimitIdentifier(user.id), 5, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { focus, difficulty, daysPerWeek, equipment, goals } = body;

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const validFocus = ['general fitness', 'weight loss', 'muscle building', 'maintain'];
    
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    if (focus && !validFocus.includes(focus)) {
      return NextResponse.json({ error: 'Invalid focus' }, { status: 400 });
    }

    if (daysPerWeek && (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7)) {
      return NextResponse.json({ error: 'Invalid days per week' }, { status: 400 });
    }

    const days = Math.min(daysPerWeek || 5, 5); // Limit to 5 days max

    const prompt = `Create a ${days}-day exercise plan. Respond with ONLY valid JSON, no extra text.

USER PROFILE:
- Available equipment: ${equipment?.join(', ') || 'none'}
- Fitness level: ${difficulty || 'beginner'}
- Goal: ${focus || 'general fitness'}

REQUIREMENTS:
- ${days} days per week, 3-4 exercises per day
- Use ONLY the equipment listed
- Keep instructions brief (max 50 chars each)
- Include calories_burned per exercise

JSON FORMAT:
{"focus":"","difficulty":"","days_per_week":${days},"exercises":[{"day":"Day 1","exercises":[{"name":"","muscle_groups":[""],"sets":3,"reps":"10","equipment":["none"],"calories_burned":50}]}]}`;

    const messages: AIMessage[] = [
      { 
        role: 'system', 
        content: 'You are a fitness trainer. Return ONLY valid JSON. No markdown, no explanations.' 
      },
      { role: 'user', content: prompt },
    ];

    const result = await getAIResponse(messages);
    console.log('AI Response length:', result.length);
    
    let cleanResult = result.replace(/```json|```/g, '').trim();
    
    // Handle truncated JSON - find the first { and last }
    const firstBrace = cleanResult.indexOf('{');
    const lastBrace = cleanResult.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanResult = cleanResult.substring(firstBrace, lastBrace + 1);
    }
    
    let exercisePlan;
    try {
      exercisePlan = JSON.parse(cleanResult);
    } catch (e) {
      console.error('Parse error:', e);
      console.error('Clean result:', cleanResult.substring(0, 500));
      exercisePlan = {
        focus: focus || 'general fitness',
        difficulty: difficulty || 'intermediate',
        days_per_week: days,
        exercises: []
      };
    }

    if (!exercisePlan.days_per_week) {
      exercisePlan.days_per_week = days;
    }
    if (!exercisePlan.focus) {
      exercisePlan.focus = focus || 'general fitness';
    }
    if (!exercisePlan.difficulty) {
      exercisePlan.difficulty = difficulty || 'intermediate';
    }

    return NextResponse.json({ exercisePlan });

  } catch (error) {
    console.error('Exercise plan error:', error);
    return NextResponse.json(
      { error: 'Could not generate exercise plan' },
      { status: 500 }
    );
  }
}
