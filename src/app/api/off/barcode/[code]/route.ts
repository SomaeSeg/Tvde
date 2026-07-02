import { NextResponse } from 'next/server';
import { mapProduct } from '@/lib/off';

// Consulta de produto por código de barras no Open Food Facts.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ product: null }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,brands,nutriments,serving_quantity`,
      {
        headers: { 'User-Agent': 'VitaOS/1.0 (app pessoal de nutricao)' },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return NextResponse.json({ product: null });
    const data = await res.json();
    if (data.status !== 1 || !data.product?.product_name) {
      return NextResponse.json({ product: null });
    }
    return NextResponse.json({ product: mapProduct(data.product) });
  } catch {
    return NextResponse.json({ product: null, error: 'off_unavailable' });
  }
}
