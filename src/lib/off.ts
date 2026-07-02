// Mapeamento de produtos Open Food Facts para o formato interno de alimento.

export interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: string | number;
  nutriments?: Record<string, number>;
}

export interface OffFood {
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  fiber_100: number | null;
  sugar_100: number | null;
  salt_100: number | null;
  serving_g: number | null;
}

export function mapProduct(p: OffProduct): OffFood {
  const n = p.nutriments ?? {};
  return {
    barcode: p.code ?? null,
    name: p.product_name ?? '',
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    kcal_100: n['energy-kcal_100g'] ?? 0,
    protein_100: n['proteins_100g'] ?? 0,
    carbs_100: n['carbohydrates_100g'] ?? 0,
    fat_100: n['fat_100g'] ?? 0,
    fiber_100: n['fiber_100g'] ?? null,
    sugar_100: n['sugars_100g'] ?? null,
    salt_100: n['salt_100g'] ?? null,
    serving_g: p.serving_quantity ? Number(p.serving_quantity) || null : null,
  };
}
