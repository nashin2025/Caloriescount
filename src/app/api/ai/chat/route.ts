import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const IS_XAI = GROQ_API_KEY?.startsWith('xai-');

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not configured');
}

import type { ChatHistory } from '@/types';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const contextSchema = z.object({
  name: z.string().max(50).default('User'),
  goal: z.string().max(20).default('maintain'),
  current_weight: z.number().min(1).max(500).default(70),
  target_weight: z.number().min(1).max(500).default(70),
  calorie_target: z.number().min(500).max(10000).default(2000),
  protein_target: z.number().min(0).max(500).default(100),
  carbs_target: z.number().min(0).max(1000).default(200),
  fat_target: z.number().min(0).max(500).default(65),
  today_calories: z.number().min(0).default(0),
  today_protein: z.number().min(0).default(0),
  today_carbs: z.number().min(0).default(0),
  today_fat: z.number().min(0).default(0),
  dietary_restrictions: z.array(z.string()).default([]),
});

function sanitizeContext(raw: unknown): z.infer<typeof contextSchema> {
  const parsed = contextSchema.safeParse(raw);
  return parsed.success ? parsed.data : contextSchema.parse({});
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
        max_tokens: 600,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "I'm having trouble responding right now.";
  } else {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 600,
    });
    return completion.choices[0]?.message?.content || "I'm having trouble responding right now.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(getRateLimitIdentifier(user.id), 15, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { message, context, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
    }

    if (history && !Array.isArray(history)) {
      return NextResponse.json({ error: 'Invalid history format' }, { status: 400 });
    }

    const safeContext = sanitizeContext(context);

    const systemPrompt = `You are CaloriesCount AI, a supportive AI diet and nutrition coach.

USER PROFILE:
- Name: ${safeContext.name}
- Goal: ${safeContext.goal} (Current: ${safeContext.current_weight}kg → Target: ${safeContext.target_weight}kg)
- Daily Targets: ${safeContext.calorie_target} kcal | Protein: ${safeContext.protein_target}g | Carbs: ${safeContext.carbs_target}g | Fat: ${safeContext.fat_target}g
- Dietary Restrictions: ${safeContext.dietary_restrictions.join(', ') || 'None'}

TODAY'S PROGRESS:
- Calories: ${safeContext.today_calories}/${safeContext.calorie_target} kcal
- Protein: ${safeContext.today_protein}/${safeContext.protein_target}g
- Carbs: ${safeContext.today_carbs}/${safeContext.carbs_target}g
- Fat: ${safeContext.today_fat}/${safeContext.fat_target}g

YOUR ROLE:
- Be encouraging, positive, and never judgmental
- Provide specific, actionable nutrition advice
- Always respect dietary restrictions
- Include approximate calorie counts when suggesting foods
- Keep responses concise (under 200 words unless asked for detailed plans)
- Use occasional emojis for friendliness (not excessive)
- Celebrate achievements and progress
- If user is over their limit, suggest gentle strategies

Respond to the user's message now in a helpful and supportive way.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10).map((msg: ChatHistory) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await getAIResponse(messages);

    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: response },
    ]);

    return NextResponse.json({ response });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'AI coach unavailable' },
      { status: 500 }
    );
  }
}
