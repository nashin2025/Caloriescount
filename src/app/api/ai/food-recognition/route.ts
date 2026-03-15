import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'AI Food Scanner requires GEMINI_API_KEY. Get free key at https://aistudio.google.com/app/apikey' 
      }, { status: 503 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = image.type || 'image/jpeg';

    let nutrition: Record<string, unknown> = {
      food_name: 'Unknown food',
      calories: 200,
      protein_g: 10,
      carbs_g: 25,
      fat_g: 8,
      serving_size: '1 serving',
      confidence: 0.3
    };

    if (GEMINI_API_KEY) {
      try {
        const modelName = 'gemini-1.5-flash-8b';
        
        const prompt = `You are a nutritionist expert. Analyze this food image and provide nutritional information. 
        
Return ONLY valid JSON in this exact format:
{
  "food_name": "estimated food name",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "serving_size": "estimated serving size",
  "confidence": 0.0
}

Provide realistic estimates based on what you see in the image.`;

        const requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          }
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (!res.ok) {
          const error = await res.text();
          console.error('Gemini API error:', res.status, error);
          throw new Error('Gemini API failed');
        }

        const data = await res.json();
        const response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const clean = response.replace(/```json|```/g, '').trim();
        
        try {
          nutrition = JSON.parse(clean);
        } catch {
          nutrition = {
            food_name: 'Unknown food',
            calories: 200,
            protein_g: 10,
            carbs_g: 25,
            fat_g: 8,
            serving_size: '1 serving',
            confidence: 0.3
          };
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        return NextResponse.json({ error: 'Google Gemini failed. Try using the search or manual entry instead.' }, { status: 502 });
      }
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;
    return NextResponse.json({ 
      ...nutrition,
      imageUrl: dataUrl
    });

  } catch (error) {
    console.error('Food recognition error:', error);
    return NextResponse.json({ error: 'Failed to recognize food. Please try search or manual entry.' }, { status: 500 });
  }
}
