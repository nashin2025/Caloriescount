'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Calendar,
  Target,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { Profile, WeightLog } from '@/types';
import { cn, getDateString } from '@/lib/utils';

const MACRO_COLORS = ['#3B82F6', '#F59E0B', '#A855F7'];

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weeklyCalories, setWeeklyCalories] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, weightsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_date', { ascending: true })
          .limit(30),
      ]);

      setProfile(profileRes.data);
      setWeightLogs(weightsRes.data || []);

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: dayLogs } = await supabase
          .from('food_logs')
          .select('calories, protein_g, carbs_g, fat_g')
          .eq('user_id', user.id)
          .eq('logged_date', dateStr);

        const totals = (dayLogs || []).reduce(
          (acc, log) => ({
            calories: acc.calories + log.calories,
            protein: acc.protein + Number(log.protein_g),
            carbs: acc.carbs + Number(log.carbs_g),
            fat: acc.fat + Number(log.fat_g),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        last7Days.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
        });
      }
      setWeeklyCalories(last7Days);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const logWeight = async () => {
    const weight = prompt('Enter your current weight (kg):');
    if (!weight || !profile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg: parseFloat(weight),
      logged_date: getDateString(),
    });

    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg;
  const weightDiff = currentWeight && profile 
    ? (currentWeight - profile.target_weight_kg).toFixed(1)
    : null;

  const macroData = profile ? [
    { name: 'Protein', value: profile.protein_target_g },
    { name: 'Carbs', value: profile.carbs_target_g },
    { name: 'Fat', value: profile.fat_target_g },
  ] : [];

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current Weight</span>
            </div>
            <p className="text-2xl font-bold">{currentWeight || '--'} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Goal Weight</span>
            </div>
            <p className="text-2xl font-bold">{profile?.target_weight_kg || '--'} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {weightDiff && parseFloat(weightDiff) > 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-muted-foreground">To Goal</span>
            </div>
            <p className="text-2xl font-bold">
              {weightDiff ? `${Math.abs(parseFloat(weightDiff))} kg` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Days to Goal</span>
            </div>
            <p className="text-2xl font-bold">
              {profile?.target_date 
                ? Math.max(0, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" className="w-full" onClick={logWeight}>
        <Scale className="mr-2 h-4 w-4" />
        Log Today&apos;s Weight
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {weightLogs.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightLogs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="logged_date" 
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="weight_kg" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Log more weights to see your trend
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="calories">
        <TabsList className="w-full">
          <TabsTrigger value="calories" className="flex-1">Calories</TabsTrigger>
          <TabsTrigger value="macros" className="flex-1">Macros</TabsTrigger>
        </TabsList>

        <TabsContent value="calories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyCalories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calories" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macros" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Macro Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}g`}
                  >
                    {macroData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Protein {profile?.protein_target_g}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Carbs {profile?.carbs_target_g}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Fat {profile?.fat_target_g}g</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
