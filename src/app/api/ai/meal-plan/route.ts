import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const IS_XAI = GROQ_API_KEY?.startsWith('xai-');

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not configured');
}

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
    const { calorieTarget, restrictions, preferences, numberOfMeals } = body;

    if (calorieTarget && (typeof calorieTarget !== 'number' || calorieTarget < 500 || calorieTarget > 10000)) {
      return NextResponse.json({ error: 'Invalid calorie target (500-10000)' }, { status: 400 });
    }

    if (numberOfMeals && (typeof numberOfMeals !== 'number' || numberOfMeals < 1 || numberOfMeals > 6)) {
      return NextResponse.json({ error: 'Invalid number of meals' }, { status: 400 });
    }

    const prompt = `Create a realistic one-day meal plan with the following requirements:

REQUIREMENTS:
- Total daily calories: ${calorieTarget} kcal (±50 kcal)
- Number of meals: ${numberOfMeals || 3} (breakfast, lunch, dinner${(numberOfMeals || 3) > 3 ? ', snacks' : ''})
- Dietary restrictions: ${restrictions?.join(', ') || 'None'}
- Preferences: ${preferences?.join(', ') || 'Balanced variety'}
- Include balanced macros (protein, carbs, fats)
- Use common, easy-to-find ingredients
- Provide realistic portion sizes

RETURN JSON FORMAT:
{
  "total_calories": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "meals": {
    "breakfast": {
      "name": "meal name",
      "description": "brief description",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "ingredients": ["item 1", "item 2"]
    },
    "lunch": { "name": "", "description": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "ingredients": [] },
    "dinner": { "name": "", "description": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "ingredients": [] }
  }
}`;

    const messages: AIMessage[] = [
      { 
        role: 'system', 
        content: 'You are a professional nutritionist. Create balanced, realistic meal plans. Return ONLY valid JSON.' 
      },
      { role: 'user', content: prompt },
    ];

    const result = await getAIResponse(messages);
    const cleanResult = result.replace(/```json|```/g, '').trim();
    let mealPlan;
    try {
      mealPlan = JSON.parse(cleanResult || '{}');
    } catch {
      mealPlan = {};
    }

    return NextResponse.json({ mealPlan });

  } catch (error) {
    console.error('Meal plan error:', error);
    return NextResponse.json(
      { error: 'Could not generate meal plan' },
      { status: 500 }
    );
  }
}
