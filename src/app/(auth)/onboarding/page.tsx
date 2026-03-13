'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  User, 
  Target, 
  Scale, 
  Activity,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateBMR, calculateTDEE, calculateMacros, getDaysUntil } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Goals', icon: Target },
  { id: 3, title: 'Body Metrics', icon: Scale },
  { id: 4, title: 'Activity', icon: Activity },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    height: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: 'moderate' as string,
    dietGoal: 'maintain' as 'lose' | 'maintain' | 'gain',
    targetDate: '',
  });

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.length >= 2;
      case 2:
        return formData.dietGoal && formData.targetDate;
      case 3:
        return formData.age && formData.height && formData.currentWeight && formData.targetWeight;
      case 4:
        return formData.activityLevel;
      default:
        return false;
    }
  };

  const getCalculatedValues = () => {
    const weight = parseFloat(formData.currentWeight) || 0;
    const height = parseFloat(formData.height) || 0;
    const age = parseInt(formData.age) || 0;
    const gender = formData.gender as 'male' | 'female';
    
    if (!weight || !height || !age) return null;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, formData.activityLevel);
    
    let adjustedCalories = tdee;
    if (formData.dietGoal === 'lose') adjustedCalories = tdee - 500;
    else if (formData.dietGoal === 'gain') adjustedCalories = tdee + 500;

    const macros = calculateMacros(adjustedCalories, formData.dietGoal, weight);
    const daysLeft = getDaysUntil(formData.targetDate);

    return { tdee, adjustedCalories, macros, daysLeft };
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weight = parseFloat(formData.currentWeight);
      const height = parseFloat(formData.height);
      const age = parseInt(formData.age);
      const bmr = calculateBMR(weight, height, age, formData.gender as 'male' | 'female');
      const tdee = calculateTDEE(bmr, formData.activityLevel);
      
      let adjustedCalories = tdee;
      if (formData.dietGoal === 'lose') adjustedCalories = tdee - 500;
      else if (formData.dietGoal === 'gain') adjustedCalories = tdee + 500;

      const macros = calculateMacros(adjustedCalories, formData.dietGoal, weight);

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        name: formData.name,
        email: user.email,
        age: parseInt(formData.age),
        gender: formData.gender,
        height_cm: parseFloat(formData.height),
        current_weight_kg: parseFloat(formData.currentWeight),
        target_weight_kg: parseFloat(formData.targetWeight),
        activity_level: formData.activityLevel,
        diet_goal: formData.dietGoal,
        daily_calorie_target: adjustedCalories,
        protein_target_g: macros.protein,
        carbs_target_g: macros.carbs,
        fat_target_g: macros.fat,
        water_goal_ml: weight * 35,
        target_date: formData.targetDate,
        onboarding_complete: true,
      });

      if (profileError) throw profileError;

      const { error: streakError } = await supabase.from('streaks').insert({
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
      });

      if (streakError && !streakError.message.includes('duplicate')) {
        throw streakError;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const calculated = getCalculatedValues();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-1",
                    step > s.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>
              {step === 1 && "Let's get to know you"}
              {step === 2 && "What do you want to achieve?"}
              {step === 3 && "Tell us about your body"}
              {step === 4 && "How active are you?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="25"
                      value={formData.age}
                      onChange={(e) => updateForm('age', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateForm('gender', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Your Goal</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'lose', label: 'Lose Weight', emoji: '📉', desc: '-500 cal' },
                      { value: 'maintain', label: 'Maintain', emoji: '⚖️', desc: '0 cal' },
                      { value: 'gain', label: 'Gain Weight', emoji: '📈', desc: '+500 cal' },
                    ].map((goal) => (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => updateForm('dietGoal', goal.value)}
                        className={cn(
                          "p-4 rounded-lg border-2 text-left transition-all",
                          formData.dietGoal === goal.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="text-2xl mb-1">{goal.emoji}</div>
                        <div className="font-medium text-sm">{goal.label}</div>
                        <div className="text-xs text-muted-foreground">{goal.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => updateForm('targetDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={(e) => updateForm('height', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.1"
                    placeholder="80"
                    value={formData.currentWeight}
                    onChange={(e) => updateForm('currentWeight', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={formData.targetWeight}
                    onChange={(e) => updateForm('targetWeight', e.target.value)}
                  />
                </div>
                {calculated && (
                  <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Your Daily Targets</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Calories:</span>{' '}
                        <span className="font-semibold">{calculated.adjustedCalories} kcal</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Protein:</span>{' '}
                        <span className="font-semibold">{calculated.macros.protein}g</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Carbs:</span>{' '}
                        <span className="font-semibold">{calculated.macros.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fat:</span>{' '}
                        <span className="font-semibold">{calculated.macros.fat}g</span>
                      </div>
                    </div>
                    {calculated.daysLeft > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {calculated.daysLeft} days to reach your goal
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Activity Level</Label>
                  {[
                    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', emoji: '🛋️' },
                    { value: 'light', label: 'Light', desc: 'Light exercise 1-3 days/week', emoji: '🚶' },
                    { value: 'moderate', label: 'Moderate', desc: 'Moderate exercise 3-5 days/week', emoji: '🏃' },
                    { value: 'active', label: 'Active', desc: 'Hard exercise 6-7 days/week', emoji: '💪' },
                    { value: 'very_active', label: 'Very Active', desc: 'Very hard exercise daily', emoji: '🏋️' },
                  ].map((activity) => (
                    <button
                      key={activity.value}
                      type="button"
                      onClick={() => updateForm('activityLevel', activity.value)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                        formData.activityLevel === activity.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{activity.emoji}</span>
                      <div>
                        <div className="font-medium">{activity.label}</div>
                        <div className="text-xs text-muted-foreground">{activity.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <div className="p-6 pt-0 flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
