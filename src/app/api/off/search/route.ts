import { NextResponse } from 'next/server';
import { mapProduct, type OffProduct } from '@/lib/off';

// Proxy para a pesquisa Open Food Facts (evita CORS e permite cache).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ products: [] });

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', q);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '15');
  url.searchParams.set('fields', 'code,product_name,brands,nutriments,serving_quantity');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VitaOS/1.0 (app pessoal de nutricao)' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ products: [] }, { status: 200 });
    const data = await res.json();
    const products = (data.products ?? [])
      .filter((p: OffProduct) => p.product_name && p.nutriments?.['energy-kcal_100g'] !== undefined)
      .map(mapProduct);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [], error: 'off_unavailable' }, { status: 200 });
  }
}
