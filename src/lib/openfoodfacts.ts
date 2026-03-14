const OFF_API_BASE = 'https://world.openfoodfacts.org';

interface NutritionData {
  name?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
}

export async function searchFoodNutrition(foodName: string): Promise<NutritionData | null> {
  try {
    const response = await fetch(
      `${OFF_API_BASE}/cgi/search.pl?` +
      `search_terms=${encodeURIComponent(foodName)}` +
      `&search_simple=1` +
      `&action=process` +
      `&json=1` +
      `&page_size=5` +
      `&fields=product_name,nutriments,serving_size,nutrition_grade_fr`
    );

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return getFallbackNutrition(foodName);
    }

    const product = data.products[0];
    const n = product.nutriments;

    return {
      name: product.product_name || foodName,
      calories: Math.round(n['energy-kcal_100g'] || n.energy_kcal_100g || 0),
      protein_g: parseFloat((n.proteins_100g || 0).toFixed(1)),
      carbs_g: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
      fat_g: parseFloat((n.fat_100g || 0).toFixed(1)),
      fiber_g: parseFloat((n.fiber_100g || 0).toFixed(1)),
      serving_size: product.serving_size || '100g',
    };

  } catch (error) {
    console.error('Open Food Facts error:', error);
    return getFallbackNutrition(foodName);
  }
}

export async function scanBarcode(barcode: string): Promise<{
  name: string;
  brand: string;
  barcode: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
  nutrition_grade?: string;
} | null> {
  try {
    const response = await fetch(
      `${OFF_API_BASE}/api/v2/product/${barcode}.json`
    );

    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const n = product.nutriments;

    return {
      name: product.product_name || 'Unknown Product',
      brand: product.brands || '',
      barcode,
      calories: Math.round(n['energy-kcal_100g'] || 0),
      protein_g: parseFloat((n.proteins_100g || 0).toFixed(1)),
      carbs_g: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
      fat_g: parseFloat((n.fat_100g || 0).toFixed(1)),
      fiber_g: parseFloat((n.fiber_100g || 0).toFixed(1)),
      serving_size: product.serving_size || '100g',
      nutrition_grade: product.nutrition_grade_fr,
    };

  } catch (error) {
    console.error('Barcode scan error:', error);
    return null;
  }
}

function getFallbackNutrition(foodName: string): NutritionData {
  const normalized = foodName.toLowerCase().replace(/[^a-z]/g, '');
  
  const FALLBACK_DATABASE: Record<string, NutritionData> = {
    'chicken': { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, serving_size: '100g' },
    'beef': { calories: 250, protein_g: 26, carbs_g: 0, fat_g: 15, fiber_g: 0, serving_size: '100g' },
    'fish': { calories: 206, protein_g: 22, carbs_g: 0, fat_g: 12, fiber_g: 0, serving_size: '100g' },
    'salmon': { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, fiber_g: 0, serving_size: '100g' },
    'egg': { calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, fiber_g: 0, serving_size: '100g' },
    'rice': { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, serving_size: '100g' },
    'pasta': { calories: 131, protein_g: 5, carbs_g: 25, fat_g: 1.1, fiber_g: 1.8, serving_size: '100g' },
    'bread': { calories: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2, fiber_g: 2.7, serving_size: '100g' },
    'potato': { calories: 77, protein_g: 2, carbs_g: 17, fat_g: 0.1, fiber_g: 2.1, serving_size: '100g' },
    'pizza': { calories: 266, protein_g: 11, carbs_g: 33, fat_g: 10, fiber_g: 2.3, serving_size: '100g' },
    'burger': { calories: 295, protein_g: 17, carbs_g: 24, fat_g: 14, fiber_g: 1.5, serving_size: '100g' },
    'fries': { calories: 312, protein_g: 3.4, carbs_g: 41, fat_g: 15, fiber_g: 3.8, serving_size: '100g' },
    'sushi': { calories: 143, protein_g: 6, carbs_g: 21, fat_g: 4, fiber_g: 0.5, serving_size: '100g' },
    'ramen': { calories: 188, protein_g: 7, carbs_g: 27, fat_g: 6, fiber_g: 2, serving_size: '100g' },
    'salad': { calories: 33, protein_g: 3, carbs_g: 6, fat_g: 0.3, fiber_g: 2, serving_size: '100g' },
    'broccoli': { calories: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6, serving_size: '100g' },
    'carrot': { calories: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2, fiber_g: 2.8, serving_size: '100g' },
    'spinach': { calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2, serving_size: '100g' },
    'tomato': { calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2, serving_size: '100g' },
    'apple': { calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, serving_size: '100g' },
    'banana': { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, fiber_g: 2.6, serving_size: '100g' },
    'orange': { calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1, fiber_g: 2.4, serving_size: '100g' },
    'milk': { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, fiber_g: 0, serving_size: '100ml' },
    'yogurt': { calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, fiber_g: 0, serving_size: '100g' },
    'cheese': { calories: 402, protein_g: 25, carbs_g: 1.3, fat_g: 33, fiber_g: 0, serving_size: '100g' },
    'chocolate': { calories: 546, protein_g: 5, carbs_g: 61, fat_g: 31, fiber_g: 3, serving_size: '100g' },
    'cake': { calories: 257, protein_g: 3, carbs_g: 42, fat_g: 9, fiber_g: 1, serving_size: '100g' },
    'coffee': { calories: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0, fiber_g: 0, serving_size: '100ml' },
    'tea': { calories: 1, protein_g: 0, carbs_g: 0.3, fat_g: 0, fiber_g: 0, serving_size: '100ml' },
    'juice': { calories: 45, protein_g: 0.5, carbs_g: 11, fat_g: 0.1, fiber_g: 0.2, serving_size: '100ml' },
  };

  for (const [key, data] of Object.entries(FALLBACK_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...data, name: foodName };
    }
  }

  return {
    calories: 200,
    protein_g: 10,
    carbs_g: 25,
    fat_g: 8,
    fiber_g: 2,
    serving_size: '100g',
  };
}

export async function searchFoodMultiSource(foodName: string) {
  let result = await searchFoodNutrition(foodName);
  
  if (result && result.calories > 0) {
    return { ...result, source: 'openfoodfacts' };
  }
  
  return { ...getFallbackNutrition(foodName), source: 'fallback' };
}
