import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `Analyze this food image and provide nutritional information. Return ONLY valid JSON in this exact format:
{
  "food_name": "estimated food name",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "serving_size": "estimated serving size",
  "confidence": 0.0
}

Provide realistic estimates based on what you see.`;

    const isXai = GROQ_API_KEY?.startsWith('xai-');
    
    let response: string;
    let nutrition: Record<string, unknown>;

    if (isXai) {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-2-vision',
          messages: [
            { 
              role: 'system', 
              content: 'You are a nutritionist expert. Analyze food images and estimate nutritional content. Return ONLY valid JSON.' 
            },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      response = data.choices?.[0]?.message?.content || '{}';
      
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
    } else {
      return NextResponse.json({ 
        error: 'Vision requires xAI API key (xai-)',
        requiresVision: true 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      ...nutrition,
      imageUrl: dataUrl
    });

  } catch (error) {
    console.error('Food recognition error:', error);
    return NextResponse.json({ error: 'Failed to recognize food' }, { status: 500 });
  }
}
