import { CartItem } from '@/types/restaurant';

export interface RawOrderRecord {
  id: string;
  customer_name: string;
  order_type: 'MESA' | 'DOMICILIO';
  table_or_address: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
}

export interface PeriodSummary {
  totalSales: number;
  orderCount: number;
  foodSales: number;
  drinkSales: number;
  averageTicket: number;
}

export function calculateAccountingSummary(
  orders: RawOrderRecord[],
  period: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
): PeriodSummary {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = orders.filter((order) => {
    const orderDate = new Date(order.created_at);

    if (period === 'DIARIO') {
      return orderDate >= startOfToday;
    }

    const diffMs = now.getTime() - orderDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (period === 'SEMANAL') return diffDays <= 7;
    if (period === 'QUINCENAL') return diffDays <= 15;
    if (period === 'MENSUAL') return diffDays <= 30;

    return true;
  });

  let totalSales = 0;
  let foodSales = 0;
  let drinkSales = 0;

  filtered.forEach((order) => {
    totalSales += Number(order.total || 0);

    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const subtotal =
          Number(item.finalPrice || item.price) * Number(item.quantity || 1);
        if (item.station === 'BARRA') {
          drinkSales += subtotal;
        } else {
          foodSales += subtotal;
        }
      });
    }
  });

  const orderCount = filtered.length;
  const averageTicket = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

  return {
    totalSales,
    orderCount,
    foodSales,
    drinkSales,
    averageTicket,
  };
}
