'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flame, 
  Droplets, 
  TrendingDown, 
  TrendingUp,
  Plus,
  ChevronRight,
  Utensils,
  Target,
  Award,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn, formatNumber, calculateProgress, getMealTypeLabel } from '@/lib/utils';
import type { Profile, FoodLog, DailySummary, Streak } from '@/types';
import { useToast } from '@/components/ui/toast';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayWater, setTodayWater] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, logsRes, waterRes, streakRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('logged_date', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false }),
        supabase
          .from('water_logs')
          .select('amount_ml')
          .eq('user_id', user.id)
          .eq('logged_date', new Date().toISOString().split('T')[0]),
        supabase.from('streaks').select('*').eq('user_id', user.id).single(),
      ]);

      setProfile(profileRes.data);
      setStreak(streakRes.data);

      const waterTotal = waterRes.data?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;
      setTodayWater(waterTotal);

      if (logsRes.data) {
        const meals = {
          breakfast: logsRes.data.filter((l) => l.meal_type === 'breakfast'),
          lunch: logsRes.data.filter((l) => l.meal_type === 'lunch'),
          dinner: logsRes.data.filter((l) => l.meal_type === 'dinner'),
          snack: logsRes.data.filter((l) => l.meal_type === 'snack'),
        };

        const summary: DailySummary = {
          date: new Date().toISOString().split('T')[0],
          total_calories: logsRes.data.reduce((sum, l) => sum + l.calories, 0),
          total_protein_g: logsRes.data.reduce((sum, l) => sum + Number(l.protein_g), 0),
          total_carbs_g: logsRes.data.reduce((sum, l) => sum + Number(l.carbs_g), 0),
          total_fat_g: logsRes.data.reduce((sum, l) => sum + Number(l.fat_g), 0),
          total_fiber_g: logsRes.data.reduce((sum, l) => sum + Number(l.fiber_g), 0),
          meals,
        };
        setTodaySummary(summary);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount: number) => {
    if (!profile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('water_logs').insert({
      user_id: user.id,
      amount_ml: amount,
      logged_date: new Date().toISOString().split('T')[0],
    });

    setTodayWater((prev) => Math.min(prev + amount, profile.water_goal_ml));
    showToast(`Added ${amount}ml water`, 'success');
  };

  const deleteFoodLog = async (logId: string) => {
    setDeletingId(logId);
    try {
      await supabase.from('food_logs').delete().eq('id', logId);
      showToast('Food removed', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const calorieProgress = calculateProgress(
    todaySummary?.total_calories || 0,
    profile.daily_calorie_target
  );
  const proteinProgress = calculateProgress(
    todaySummary?.total_protein_g || 0,
    profile.protein_target_g
  );
  const carbsProgress = calculateProgress(
    todaySummary?.total_carbs_g || 0,
    profile.carbs_target_g
  );
  const fatProgress = calculateProgress(
    todaySummary?.total_fat_g || 0,
    profile.fat_target_g
  );
  const waterProgress = Math.min(
    Math.round((todayWater / profile.water_goal_ml) * 100),
    100
  );

  const remainingCalories = profile.daily_calorie_target - (todaySummary?.total_calories || 0);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good {getGreeting()}, {profile.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {streak && streak.current_streak > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            <Award className="h-3 w-3 mr-1" />
            {streak.current_streak} day streak
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary to-teal-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm">Calories Remaining</p>
                <p className="text-4xl font-bold">
                  {remainingCalories > 0 ? remainingCalories : 0}
                </p>
              </div>
              <div className="w-24 h-24 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min(calorieProgress * 2.51, 251)} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{calorieProgress}%</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-white/60">Eaten</p>
                <p className="font-semibold">{todaySummary?.total_calories || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60">Goal</p>
                <p className="font-semibold">{profile.daily_calorie_target}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Flame className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm text-muted-foreground">Protein</span>
            </div>
            <p className="text-xl font-bold">
              {todaySummary?.total_protein_g || 0}g
            </p>
            <Progress value={proteinProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {profile.protein_target_g}g goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Utensils className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-sm text-muted-foreground">Carbs</span>
            </div>
            <p className="text-xl font-bold">
              {todaySummary?.total_carbs_g || 0}g
            </p>
            <Progress value={carbsProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {profile.carbs_target_g}g goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-sm text-muted-foreground">Fat</span>
            </div>
            <p className="text-xl font-bold">
              {todaySummary?.total_fat_g || 0}g
            </p>
            <Progress value={fatProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {profile.fat_target_g}g goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                <Droplets className="h-4 w-4 text-cyan-500" />
              </div>
              <span className="text-sm text-muted-foreground">Water</span>
            </div>
            <p className="text-xl font-bold">{todayWater}ml</p>
            <Progress value={waterProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {profile.water_goal_ml}ml goal
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quick Add Water</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[150, 250, 350, 500].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => addWater(amount)}
                className="flex-1"
              >
                +{amount}ml
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today&apos;s Meals</CardTitle>
            <Link href="/log">
              <Button variant="ghost" size="sm">
                Add <Plus className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="breakfast">
            <TabsList className="w-full">
              <TabsTrigger value="breakfast" className="flex-1">Breakfast</TabsTrigger>
              <TabsTrigger value="lunch" className="flex-1">Lunch</TabsTrigger>
              <TabsTrigger value="dinner" className="flex-1">Dinner</TabsTrigger>
              <TabsTrigger value="snack" className="flex-1">Snack</TabsTrigger>
            </TabsList>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
              <TabsContent key={meal} value={meal} className="mt-3 space-y-2">
                {todaySummary?.meals[meal]?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No {meal} logged yet
                  </p>
                )}
                {todaySummary?.meals[meal]?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        P: {log.protein_g}g • C: {log.carbs_g}g • F: {log.fat_g}g
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">{log.calories}</p>
                        <p className="text-xs text-muted-foreground">cal</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteFoodLog(log.id)}
                        disabled={deletingId === log.id}
                      >
                        {deletingId === log.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/log">
          <Button className="w-full h-12" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Log Food
          </Button>
        </Link>
        <Link href="/coach">
          <Button variant="outline" className="w-full h-12" size="lg">
            <span className="mr-2">🤖</span>
            Ask AI Coach
          </Button>
        </Link>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
