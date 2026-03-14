'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dumbbell, 
  Plus, 
  Flame, 
  Timer, 
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import type { Profile, ExerciseLog, ExercisePlan } from '@/types';
import { cn, getDateString } from '@/lib/utils';

const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'No Equipment',
  dumbbells: 'Dumbbells',
  resistance_bands: 'Resistance Bands',
  gym: 'Gym Access',
  pull_up_bar: 'Pull-up Bar',
  kettlebell: 'Kettlebell',
};

const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest', emoji: '💪' },
  { value: 'back', label: 'Back', emoji: '🔙' },
  { value: 'shoulders', label: 'Shoulders', emoji: '🎯' },
  { value: 'biceps', label: 'Biceps', emoji: '💪' },
  { value: 'triceps', label: 'Triceps', emoji: '💪' },
  { value: 'legs', label: 'Legs', emoji: '🦵' },
  { value: 'core', label: 'Core', emoji: '🎽' },
  { value: 'full_body', label: 'Full Body', emoji: '🏃' },
  { value: 'cardio', label: 'Cardio', emoji: '❤️' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-500',
  intermediate: 'bg-yellow-500',
  advanced: 'bg-red-500',
};

export default function ExercisePage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [exercisePlan, setExercisePlan] = useState<ExercisePlan | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [customExercises, setCustomExercises] = useState<{name: string, muscleGroup: string, sets?: number, reps?: number, duration?: number}[]>([]);
  const [logForm, setLogForm] = useState({
    exerciseName: '',
    muscleGroup: '',
    duration: '',
    sets: '',
    reps: '',
    difficulty: 'intermediate',
  });

  const DEFAULT_EXERCISES = [
    { name: 'Running', muscleGroup: 'cardio', duration: 30, defaultDuration: true },
    { name: 'Walking', muscleGroup: 'cardio', duration: 30, defaultDuration: true },
    { name: 'Cycling', muscleGroup: 'cardio', duration: 30, defaultDuration: true },
    { name: 'Jump Rope', muscleGroup: 'cardio', duration: 15, defaultDuration: true },
    { name: 'Swimming', muscleGroup: 'cardio', duration: 30, defaultDuration: true },
    { name: 'Push-ups', muscleGroup: 'chest', sets: 3, reps: 15 },
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 12 },
    { name: 'Chest Fly', muscleGroup: 'chest', sets: 3, reps: 12 },
    { name: 'Pull-ups', muscleGroup: 'back', sets: 3, reps: 8 },
    { name: 'Rows', muscleGroup: 'back', sets: 3, reps: 12 },
    { name: 'Lat Pulldown', muscleGroup: 'back', sets: 3, reps: 12 },
    { name: 'Shoulder Press', muscleGroup: 'shoulders', sets: 3, reps: 12 },
    { name: 'Lateral Raises', muscleGroup: 'shoulders', sets: 3, reps: 15 },
    { name: 'Bicep Curls', muscleGroup: 'biceps', sets: 3, reps: 12 },
    { name: 'Hammer Curls', muscleGroup: 'biceps', sets: 3, reps: 12 },
    { name: 'Tricep Dips', muscleGroup: 'triceps', sets: 3, reps: 12 },
    { name: 'Tricep Extensions', muscleGroup: 'triceps', sets: 3, reps: 12 },
    { name: 'Squats', muscleGroup: 'legs', sets: 3, reps: 15 },
    { name: 'Lunges', muscleGroup: 'legs', sets: 3, reps: 12 },
    { name: 'Leg Press', muscleGroup: 'legs', sets: 3, reps: 12 },
    { name: 'Calf Raises', muscleGroup: 'legs', sets: 3, reps: 15 },
    { name: 'Deadlift', muscleGroup: 'legs', sets: 3, reps: 10 },
    { name: 'Plank', muscleGroup: 'core', duration: 1, defaultDuration: true },
    { name: 'Crunches', muscleGroup: 'core', sets: 3, reps: 20 },
    { name: 'Russian Twist', muscleGroup: 'core', sets: 3, reps: 20 },
    { name: 'Leg Raises', muscleGroup: 'core', sets: 3, reps: 15 },
    { name: 'Burpees', muscleGroup: 'full_body', sets: 3, reps: 10 },
    { name: 'Mountain Climbers', muscleGroup: 'full_body', duration: 30, defaultDuration: true },
    { name: 'Kettlebell Swing', muscleGroup: 'full_body', sets: 3, reps: 15 },
    { name: 'Battle Ropes', muscleGroup: 'full_body', duration: 30, defaultDuration: true },
  ];

  const [showAnimation, setShowAnimation] = useState(false);
  const [animationLoading, setAnimationLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);

  const planExercises = exercisePlan?.exercises?.flatMap(day => 
    (day.exercises || []).map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscle_groups?.[0] || 'full_body',
      sets: ex.sets,
      reps: typeof ex.reps === 'string' ? parseInt(ex.reps) || 10 : (ex.reps || 10),
      duration: ex.duration_min || (ex.calories_burned > 100 ? 30 : 20),
    }))
  ) || [];
  
  const allExercises = exercisePlan 
    ? planExercises
    : [...customExercises, ...DEFAULT_EXERCISES];

  const [exerciseInfo, setExerciseInfo] = useState<{
    animation: string;
    instructions: string[];
    tips: string[];
    gifUrl?: string;
    imagePrompt?: string;
  } | null>(null);

  const fetchExerciseAnimation = async (exerciseName: string) => {
    setAnimationLoading(true);
    setImageLoading(true);
    setShowAnimation(true);
    setExerciseInfo(null);
    setAiImageUrl(null);
    
    try {
      // Get AI instructions
      const aiRes = await fetch('/api/exercise-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName }),
      });
      const aiData = await aiRes.json();
      setExerciseInfo(aiData);

      // Generate exercise image
      setImageLoading(true);
      
      const imageRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName }),
      });
      const imageData = await imageRes.json();
      console.log('Image data:', imageData);
      
      if (imageData?.imageUrl) {
        setAiImageUrl(imageData.imageUrl);
      }
    } catch (err) {
      console.error('Error fetching exercise info:', err);
      
      try {
        const aiRes = await fetch('/api/exercise-animation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseName }),
        });
        const aiData = await aiRes.json();
        setExerciseInfo(aiData);
      } catch {
        // Ignore
      }
    } finally {
      setAnimationLoading(false);
      setImageLoading(false);
    }
  };

  const handleExerciseChange = (exerciseName: string) => {
    const exercise = allExercises.find((e: any) => e.name === exerciseName);
    if (exercise) {
      const isDurationBased = exercise.duration && !exercise.sets;
      setLogForm(prev => ({
        ...prev,
        exerciseName,
        muscleGroup: exercise.muscleGroup,
        duration: isDurationBased ? String(exercise.duration) : '',
        sets: exercise.sets ? String(exercise.sets) : '',
        reps: exercise.reps ? String(exercise.reps) : '',
      }));
      fetchExerciseAnimation(exerciseName);
    }
  };

  const supabase = createClient();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, logsRes, planRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('logged_date', getDateString())
          .order('created_at', { ascending: false }),
        fetch('/api/exercise-plan').then(r => r.json()),
      ]);

      setProfile(profileRes.data);
      setExerciseLogs(logsRes.data || []);
      if (planRes.plan?.plan_data) {
        setExercisePlan(planRes.plan.plan_data);
      }
    } catch (error) {
      console.error('Error loading exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateExercisePlan = async () => {
    if (exercisePlan) {
      const allExercises = exercisePlan.exercises?.flatMap(day => day.exercises || []) || [];
      const todayLogs = exerciseLogs.map(l => l.exercise_name.toLowerCase());
      const completedNames = new Set(todayLogs);
      const completedCount = allExercises.filter(ex => completedNames.has(ex.name.toLowerCase())).length;
      
      if (completedCount < allExercises.length) {
        alert(`Please complete all ${allExercises.length} exercises from your current plan before generating a new one. You've completed ${completedCount} of ${allExercises.length}.`);
        return;
      }
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const equipment = profile?.equipment_preferences?.length ? profile.equipment_preferences : ['none'];
      
      console.log('Generating exercise plan with:', { equipment, focus: profile?.diet_goal });

      const res = await fetch('/api/ai/exercise-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus: profile?.diet_goal === 'lose' ? 'weight loss' : profile?.diet_goal === 'gain' ? 'muscle building' : 'general fitness',
          difficulty: 'intermediate',
          daysPerWeek: 5,
          equipment: equipment,
          goals: profile?.diet_goal,
        }),
      });

      const data = await res.json();
      console.log('Exercise plan response:', data);
      
      if (data.exercisePlan) {
        setExercisePlan(data.exercisePlan);
        
        await fetch('/api/exercise-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: data.exercisePlan }),
        });
        
        const planExercises = data.exercisePlan.exercises?.flatMap((day: any) => 
          (day.exercises || []).map((ex: any) => ({
            name: ex.name,
            muscleGroup: ex.muscle_groups?.[0] || 'full_body',
            sets: ex.sets,
            reps: parseInt(ex.reps) || 10,
          }))
        ) || [];
        
        const newExercises = planExercises.filter((ex: any) => 
          !DEFAULT_EXERCISES.find(d => d.name.toLowerCase() === ex.name.toLowerCase()) &&
          !customExercises.find(c => c.name.toLowerCase() === ex.name.toLowerCase())
        );
        
        if (newExercises.length > 0) {
          setCustomExercises(prev => [...prev, ...newExercises]);
        }
      } else if (data.error) {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating exercise plan:', error);
      alert('Failed to generate exercise plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const QUICK_EXERCISES = [
    { name: 'Running', duration: 30, muscleGroup: 'cardio' },
    { name: 'Walking', duration: 30, muscleGroup: 'cardio' },
    { name: 'Cycling', duration: 30, muscleGroup: 'cardio' },
    { name: 'Jump Rope', duration: 15, muscleGroup: 'cardio' },
    { name: 'Push-ups', sets: 3, reps: 15, muscleGroup: 'chest' },
    { name: 'Squats', sets: 3, reps: 15, muscleGroup: 'legs' },
    { name: 'Plank', duration: 1, muscleGroup: 'core' },
    { name: 'Burpees', sets: 3, reps: 10, muscleGroup: 'full_body' },
    { name: 'Lunges', sets: 3, reps: 12, muscleGroup: 'legs' },
    { name: 'Dips', sets: 3, reps: 12, muscleGroup: 'triceps' },
  ];

  const logQuickExercise = async (exercise: typeof QUICK_EXERCISES[0]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('exercise_logs').insert({
        user_id: user.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscleGroup,
        duration_min: exercise.duration || null,
        sets: exercise.sets || null,
        reps: exercise.reps || null,
        difficulty: 'intermediate',
        logged_date: getDateString(),
      });
      loadData();
    } catch (error) {
      console.error('Error logging exercise:', error);
    }
  };

  const logCustomExercise = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !logForm.exerciseName) return;

      await supabase.from('exercise_logs').insert({
        user_id: user.id,
        exercise_name: logForm.exerciseName,
        muscle_group: logForm.muscleGroup || null,
        duration_min: logForm.duration ? parseInt(logForm.duration) : null,
        sets: logForm.sets ? parseInt(logForm.sets) : null,
        reps: logForm.reps ? parseInt(logForm.reps) : null,
        difficulty: logForm.difficulty,
        logged_date: getDateString(),
      });

      setLogForm({ exerciseName: '', muscleGroup: '', duration: '', sets: '', reps: '', difficulty: 'intermediate' });
      setShowLogForm(false);
      loadData();
    } catch (error) {
      console.error('Error logging exercise:', error);
    }
  };

  const todayCalories = exerciseLogs.reduce((sum: number, log: any) => {
    const mins = log.duration_min || 0;
    const reps = log.reps || 0;
    const sets = log.sets || 1;
    return sum + Math.round((mins > 0 ? mins * 8 : reps * sets * 0.5));
  }, 0);

  const todayDuration = exerciseLogs.reduce((sum, log: any) => sum + (log.duration_min || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Dumbbell className="h-6 w-6" />
          Exercise
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLogForm(!showLogForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Exercise
          </Button>
          <Button onClick={generateExercisePlan} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Dumbbell className="h-4 w-4 mr-2" />}
            Generate Plan
          </Button>
        </div>
      </div>

      {!exercisePlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_EXERCISES.map((exercise, idx) => (
                <button
                  key={idx}
                  onClick={() => logQuickExercise(exercise)}
                  className="p-2 text-xs bg-muted hover:bg-primary/20 rounded-lg transition-colors text-center"
                >
                  {exercise.name}
                  <span className="block text-muted-foreground text-[10px]">
                    {exercise.duration ? `${exercise.duration}m` : `${exercise.sets}x${exercise.reps}`}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {exercisePlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Log - Today&apos;s Plan Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {exercisePlan.exercises?.flatMap((day: any) => day.exercises || []).slice(0, 8).map((ex: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => logQuickExercise({ name: ex.name, muscleGroup: ex.muscle_groups?.[0] || 'full_body', duration: ex.duration_min, sets: ex.sets, reps: parseInt(ex.reps) })}
                  className="p-2 text-xs bg-muted hover:bg-primary/20 rounded-lg transition-colors text-center"
                >
                  {ex.name}
                  <span className="block text-muted-foreground text-[10px]">
                    {ex.sets}x{ex.reps}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showLogForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Exercise</Label>
              <Select value={logForm.exerciseName} onValueChange={handleExerciseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {allExercises.length > 0 ? (
                    allExercises.map((ex: any) => (
                      <SelectItem key={ex.name} value={ex.name}>
                        {ex.name} ({MUSCLE_GROUPS.find(m => m.value === ex.muscleGroup)?.emoji} {ex.muscleGroup})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      {exercisePlan ? 'No exercises in plan' : 'Generate a plan first'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={logForm.duration}
                  onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Sets</Label>
                <Input
                  type="number"
                  value={logForm.sets}
                  onChange={(e) => setLogForm(prev => ({ ...prev, sets: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={logForm.reps}
                  onChange={(e) => setLogForm(prev => ({ ...prev, reps: e.target.value }))}
                  placeholder="12"
                />
              </div>
            </div>
            <Button onClick={logCustomExercise} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Exercise
            </Button>
          </CardContent>
        </Card>
      )}

      {showAnimation && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{logForm.exerciseName || 'Exercise'} Guide</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAnimation(false)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {animationLoading || imageLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {imageLoading ? 'Generating exercise image...' : 'Loading...'}
                  </p>
                </div>
              </div>
            ) : exerciseInfo ? (
              <div className="space-y-4">
                {imageLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Generating exercise image...</p>
                    </div>
                  </div>
                ) : aiImageUrl ? (
                  <div className="flex justify-center">
                    <Image 
                      src={aiImageUrl} 
                      alt={logForm.exerciseName} 
                      width={192}
                      height={192}
                      className="h-48 object-contain rounded-lg border"
                      onLoad={() => setImageLoading(false)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        setImageLoading(false);
                      }}
                    />
                  </div>
                ) : null}
                {!aiImageUrl && !imageLoading && exerciseInfo ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-6 text-center">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
                    <p className="font-medium mb-2">{logForm.exerciseName}</p>
                    <p className="text-sm text-muted-foreground">{exerciseInfo.animation}</p>
                  </div>
                ) : null}
                {exerciseInfo && (
                  <>
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">How to do it:</p>
                      <p className="text-sm text-muted-foreground">{exerciseInfo.animation}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Step-by-step:</p>
                      <ol className="space-y-2">
                        {exerciseInfo.instructions.map((step, idx) => (
                          <li key={idx} className="flex gap-2 text-sm">
                            <span className="font-medium text-primary">{idx + 1}.</span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Tips:</p>
                      <ul className="space-y-1">
                        {exerciseInfo.tips.map((tip, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-green-500">✓</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Select an exercise to see instructions</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Calories Burned</span>
            </div>
            <p className="text-2xl font-bold">{todayCalories} kcal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Duration</span>
            </div>
            <p className="text-2xl font-bold">{todayDuration} min</p>
          </CardContent>
        </Card>
      </div>

      {exerciseLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Exercises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exerciseLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{log.exercise_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.duration_min ? `${log.duration_min} min` : `${log.sets}x${log.reps} reps`}
                    {log.muscle_group && ` • ${log.muscle_group}`}
                  </p>
                </div>
                <Badge className={DIFFICULTY_COLORS[log.difficulty || 'intermediate']}>
                  {log.difficulty}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {exercisePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Your Weekly Exercise Plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              {exercisePlan.days_per_week || 5} days/week • {exercisePlan.difficulty || 'intermediate'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(exercisePlan.exercises || []).map((day: { day: string; exercises: any[] }, idx: number) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setSelectedDay(selectedDay === day.day ? null : day.day)}
                >
                  <span className="font-medium">{day.day}</span>
                  {selectedDay === day.day ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {selectedDay === day.day && (
                  <div className="p-4 space-y-3">
                    {day.exercises?.map((ex, i) => (
                      <div key={i} className="border-l-2 border-primary pl-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{ex.name}</p>
                          <Badge variant="outline">{ex.calories_burned} cal</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ex.sets} x {ex.reps} • {ex.muscle_groups?.join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Equipment: {ex.equipment?.join(', ') || 'none'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!exercisePlan && !generating && (
        <Card>
          <CardContent className="p-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Generate an exercise plan tailored to your goals and equipment
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Available: {profile?.equipment_preferences?.map(e => EQUIPMENT_LABELS[e] || e).join(', ') || 'None'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
