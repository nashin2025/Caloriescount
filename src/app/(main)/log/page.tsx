'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Camera, ScanLine, Plus, X, Sparkles, Upload } from 'lucide-react';
import type { MealType, FoodSearchResult } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { value: 'lunch', label: 'Lunch', emoji: '🌤️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍿' },
];

export default function LogPage() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [logged, setLogged] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size: string;
    confidence: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchFood();
      }
    }, 500);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      await analyzeFood(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async (imageData: string) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      const response = await fetch(imageData);
      const blob = await response.blob();
      formData.append('image', blob, 'food.jpg');

      const res = await fetch('/api/ai/food-recognition', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        showToast(data.error, 'error');
      } else {
        setAiResult(data);
        setCustomName(data.food_name || '');
        setCustomCalories(String(data.calories || 0));
        setCustomProtein(String(data.protein_g || 0));
        setCustomCarbs(String(data.carbs_g || 0));
        setCustomFat(String(data.fat_g || 0));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      showToast('Failed to analyze food', 'error');
    } finally {
      setCapturing(false);
      setAnalyzing(false);
    }
  };

  const resetAiCapture = () => {
    setCapturedImage(null);
    setAiResult(null);
    setAiMode(false);
  };

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setSearchQuery('');
  };

  const logFood = async () => {
    if (!selectedFood && !manualMode) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let calories, protein, carbs, fat, name;

      if (manualMode) {
        calories = parseInt(customCalories) || 0;
        protein = parseFloat(customProtein) || 0;
        carbs = parseFloat(customCarbs) || 0;
        fat = parseFloat(customFat) || 0;
        name = customName;
      } else if (selectedFood) {
        const multiplier = parseFloat(servingSize) || 1;
        calories = Math.round((selectedFood.calories || 0) * multiplier);
        protein = parseFloat(((selectedFood.protein_g || 0) * multiplier).toFixed(1));
        carbs = parseFloat(((selectedFood.carbs_g || 0) * multiplier).toFixed(1));
        fat = parseFloat(((selectedFood.fat_g || 0) * multiplier).toFixed(1));
        name = selectedFood.name || '';
      } else {
        return;
      }

      await supabase.from('food_logs').insert({
        user_id: user.id,
        food_name: name,
        meal_type: mealType,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        fiber_g: 0,
        serving_size: manualMode ? customName : `${servingSize} ${servingUnit}`,
        serving_quantity: parseFloat(servingSize) || 1,
        source: 'manual',
        logged_date: new Date().toISOString().split('T')[0],
      });

      showToast(`${name} logged successfully!`, 'success');
      setLogged(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Log error:', error);
      showToast('Failed to log food', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (logged) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <p className="text-lg font-semibold">Food logged successfully!</p>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-2xl font-bold">Log Food</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {MEAL_TYPES.map((meal) => (
          <button
            key={meal.value}
            onClick={() => setMealType(meal.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all",
              mealType === meal.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span>{meal.emoji}</span>
            <span>{meal.label}</span>
          </button>
        ))}
      </div>

      <Tabs value={aiMode ? 'ai' : manualMode ? 'manual' : 'search'} onValueChange={(v) => {
        if (v === 'ai') setAiMode(true);
        else {
          setAiMode(false);
          setManualMode(v === 'manual');
        }
      }}>
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1">Search</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            <Sparkles className="w-4 h-4 mr-1" />
            AI Scan
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {searchResults.length > 0 && !selectedFood && (
            <div className="space-y-2">
              {searchResults.map((food, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFood(food)}
                  className="w-full p-3 text-left bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {food.serving_size || '100g'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{food.calories}</p>
                      <p className="text-xs text-muted-foreground">calories</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedFood && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{selectedFood.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedFood(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{selectedFood.calories}</p>
                    <p className="text-xs text-muted-foreground">Cal</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{selectedFood.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <p className="text-lg font-bold text-amber-600">{selectedFood.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{selectedFood.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      min="0.25"
                      step="0.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={servingUnit} onValueChange={setServingUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serving">Serving</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="cup">Cup</SelectItem>
                        <SelectItem value="piece">Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full" onClick={logFood} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Food
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            // @ts-ignore - capture is valid but TypeScript doesn't recognize it
            capture="camera"
            className="hidden"
            onChange={handleImageCapture}
          />

          {!capturedImage ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <ScanLine className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI Food Scanner</h3>
                    <p className="text-sm text-muted-foreground">
                      Take a photo of your food and AI will estimate the calories
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 flex flex-col gap-2"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload Photo</span>
                  </Button>
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-20 flex flex-col gap-2"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-sm">Take Photo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : analyzing || capturing ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={capturedImage}
                    alt="Captured food"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                      <p>Analyzing food...</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : aiResult ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{aiResult.food_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {aiResult.serving_size} • Confidence: {Math.round(aiResult.confidence * 100)}%
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={resetAiCapture}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                  <Image
                    src={capturedImage}
                    alt="Captured food"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{aiResult.calories}</p>
                    <p className="text-xs text-muted-foreground">Cal</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{aiResult.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <p className="text-lg font-bold text-amber-600">{aiResult.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{aiResult.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      min="0.25"
                      step="0.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={servingUnit} onValueChange={setServingUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serving">Serving</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="cup">Cup</SelectItem>
                        <SelectItem value="piece">Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={logFood} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Food
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Food Name</Label>
                <Input
                  placeholder="e.g., Homemade Salad"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fat (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={logFood}
                disabled={loading || !customName || !customCalories}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Food
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
