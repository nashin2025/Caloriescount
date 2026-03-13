'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, Sparkles, UtensilsCrossed, MessageCircle } from 'lucide-react';
import type { Profile, ChatHistory } from '@/types';
import { cn } from '@/lib/utils';

const SUGGESTED_PROMPTS = [
  "What should I eat for lunch today?",
  "Give me a healthy snack idea",
  "How can I reduce my carbs?",
  "What's a good high-protein meal?",
  "Help me plan my meals for tomorrow",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CoachPage() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI nutrition coach. Ask me anything about healthy eating, meal planning, or nutrition tips! 🌟' }
  ]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [context, setContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    const { data: logs } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', new Date().toISOString().split('T')[0]);

    const todayLogs = logs || [];
    setContext({
      name: profileData?.name || 'User',
      goal: profileData?.diet_goal || 'maintain',
      current_weight: profileData?.current_weight_kg || 0,
      target_weight: profileData?.target_weight_kg || 0,
      calorie_target: profileData?.daily_calorie_target || 2000,
      protein_target: profileData?.protein_target_g || 100,
      carbs_target: profileData?.carbs_target_g || 200,
      fat_target: profileData?.fat_target_g || 65,
      today_calories: todayLogs.reduce((sum, l) => sum + l.calories, 0),
      today_protein: todayLogs.reduce((sum, l) => sum + Number(l.protein_g), 0),
      today_carbs: todayLogs.reduce((sum, l) => sum + Number(l.carbs_g), 0),
      today_fat: todayLogs.reduce((sum, l) => sum + Number(l.fat_g), 0),
      dietary_restrictions: profileData?.dietary_restrictions || [],
    });
  };

  const sendMessage = async (message?: string) => {
    const text = message || input;
    if (!text.trim() || !context) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context, history }),
      });

      const data = await res.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: 'Generate a meal plan for today' }]);

    try {
      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorieTarget: context?.calorie_target || 2000,
          restrictions: context?.dietary_restrictions || [],
          preferences: [],
        }),
      });

      const data = await res.json();
      
      if (data.mealPlan) {
        const mealPlan = data.mealPlan as {
          total_calories: number;
          meals: Record<string, { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number } | null>;
        };
        let response = `🍽️ **Your Daily Meal Plan** (${mealPlan.total_calories} kcal)\n\n`;
        
        for (const [meal, details] of Object.entries(mealPlan.meals)) {
          if (details && typeof details === 'object') {
            response += `**${meal.charAt(0).toUpperCase() + meal.slice(1)}**: ${details.name}\n`;
            response += `   ${details.calories} kcal | P: ${details.protein_g}g | C: ${details.carbs_g}g | F: ${details.fat_g}g\n\n`;
          }
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('Meal plan error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t generate a meal plan right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          AI Coach
        </h1>
        <Button variant="outline" size="sm" onClick={generateMealPlan} disabled={loading}>
          <UtensilsCrossed className="h-4 w-4 mr-2" />
          Meal Plan
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-normal text-muted-foreground">
            <Sparkles className="h-4 w-4 inline mr-1 text-amber-500" />
            Powered by Groq AI
          </CardTitle>
        </CardHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
