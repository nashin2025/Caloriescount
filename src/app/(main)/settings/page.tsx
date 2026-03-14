'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Target, 
  LogOut,
  Loader2,
  Save,
  Dumbbell
} from 'lucide-react';
import { calculateBMR, calculateTDEE, calculateMacros } from '@/lib/utils';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: '',
    dietGoal: '',
    waterGoal: '',
    equipmentPreferences: [] as string[],
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setFormData({
          name: data.name || '',
          age: data.age?.toString() || '',
          gender: data.gender || '',
          height: data.height_cm?.toString() || '',
          currentWeight: data.current_weight_kg?.toString() || '',
          targetWeight: data.target_weight_kg?.toString() || '',
          activityLevel: data.activity_level || '',
          dietGoal: data.diet_goal || '',
          waterGoal: data.water_goal_ml?.toString() || '',
          equipmentPreferences: data.equipment_preferences || ['none'],
        });
      }
      setFetching(false);
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleEquipment = (equipment: string) => {
    setFormData(prev => {
      const current = prev.equipmentPreferences || [];
      if (current.includes(equipment)) {
        return { ...prev, equipmentPreferences: current.filter(e => e !== equipment) };
      } else {
        return { ...prev, equipmentPreferences: [...current, equipment] };
      }
    });
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weight = parseFloat(formData.currentWeight);
      const height = parseFloat(formData.height);
      const age = parseInt(formData.age);

      const bmr = calculateBMR(weight, height, age, formData.gender as 'male' | 'female');
      const tdee = calculateTDEE(bmr, formData.activityLevel);
      
      let adjustedCalories = tdee;
      if (formData.dietGoal === 'lose') adjustedCalories = tdee - 500;
      else if (formData.dietGoal === 'gain') adjustedCalories = tdee + 500;

      const macros = calculateMacros(adjustedCalories, formData.dietGoal as any, weight);

      await supabase.from('profiles').update({
        name: formData.name,
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
        water_goal_ml: parseInt(formData.waterGoal) || 2000,
        equipment_preferences: formData.equipmentPreferences.length > 0 ? formData.equipmentPreferences : ['none'],
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => updateForm('age', e.target.value)}
                placeholder="25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => updateForm('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input
                type="number"
                value={formData.height}
                onChange={(e) => updateForm('height', e.target.value)}
                placeholder="175"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.currentWeight}
                onChange={(e) => updateForm('currentWeight', e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) => updateForm('targetWeight', e.target.value)}
                placeholder="70"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Diet Goal</Label>
              <Select value={formData.dietGoal} onValueChange={(v) => updateForm('dietGoal', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose Weight</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="gain">Gain Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Water Goal (ml)</Label>
              <Input
                type="number"
                value={formData.waterGoal}
                onChange={(e) => updateForm('waterGoal', e.target.value)}
                placeholder="2000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select value={formData.activityLevel} onValueChange={(v) => updateForm('activityLevel', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Available Equipment
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'none', label: 'No Equipment', desc: 'Bodyweight only' },
                { value: 'dumbbells', label: 'Dumbbells', desc: 'Adjustable or fixed' },
                { value: 'resistance_bands', label: 'Resistance Bands', desc: 'Elastic bands' },
                { value: 'pull_up_bar', label: 'Pull-up Bar', desc: 'Door or wall mounted' },
                { value: 'kettlebell', label: 'Kettlebell', desc: 'Weighted ball' },
                { value: 'gym', label: 'Gym Access', desc: 'Full gym equipment' },
              ].map((eq) => (
                <button
                  key={eq.value}
                  type="button"
                  onClick={() => toggleEquipment(eq.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.equipmentPreferences?.includes(eq.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{eq.label}</div>
                  <div className="text-xs text-muted-foreground">{eq.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={saveProfile} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>

      <Separator />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
