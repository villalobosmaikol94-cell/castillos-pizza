import { NextResponse } from 'next/server';
import { Order } from '@/types/restaurant';

export async function POST(request: Request) {
  try {
    const order: Order = await request.json();

    const foodItems = order.items.filter((item) => item.station === 'COCINA');
    const drinkItems = order.items.filter((item) => item.station === 'BARRA');

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      stations: {
        cocinaCount: foodItems.length,
        barraCount: drinkItems.length,
      },
    });
  } catch (error) {
    console.error('Error en /api/imprimir:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al procesar comandas' },
      { status: 500 }
    );
  }
}
