import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { calorieTarget, restrictions, preferences, numberOfMeals } = await request.json();

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

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional nutritionist. Create balanced, realistic meal plans. Return ONLY valid JSON.' 
        },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    const mealPlan = JSON.parse(result || '{}');

    return NextResponse.json({ mealPlan });

  } catch (error: any) {
    console.error('Meal plan error:', error);
    return NextResponse.json(
      { error: 'Could not generate meal plan' },
      { status: 500 }
    );
  }
}
