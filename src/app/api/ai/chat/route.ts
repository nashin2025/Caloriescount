import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, context, history } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const systemPrompt = `You are NutriAI, a supportive AI diet and nutrition coach.

USER PROFILE:
- Name: ${context?.name || 'User'}
- Goal: ${context?.goal || 'maintain'} (Current: ${context?.current_weight}kg → Target: ${context?.target_weight}kg)
- Daily Targets: ${context?.calorie_target || 2000} kcal | Protein: ${context?.protein_target || 100}g | Carbs: ${context?.carbs_target || 200}g | Fat: ${context?.fat_target || 65}g
- Dietary Restrictions: ${context?.dietary_restrictions?.join(', ') || 'None'}

TODAY'S PROGRESS:
- Calories: ${context?.today_calories || 0}/${context?.calorie_target || 2000} kcal
- Protein: ${context?.today_protein || 0}/${context?.protein_target || 100}g
- Carbs: ${context?.today_carbs || 0}/${context?.carbs_target || 200}g
- Fat: ${context?.today_fat || 0}/${context?.fat_target || 65}g

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

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history || []).slice(-10).map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 600,
    });

    const response = completion.choices[0]?.message?.content || 
           "I'm having trouble responding right now. Please try again!";

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'AI coach unavailable', message: error.message },
      { status: 500 }
    );
  }
}
