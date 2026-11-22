'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  UtensilsCrossed,
  Bike,
  Download,
  Calendar,
  RefreshCw,
  Award,
  Wallet,
  Trash2,
} from 'lucide-react';

interface StoredOrderRow {
  id: string;
  customer_name: string;
  order_type: 'MESA' | 'DOMICILIO';
  table_or_address: string;
  items: {
    name: string;
    quantity: number;
    finalPrice: number;
    station: string;
  }[];
  total: number;
  status: string;
  waiter_name?: string;
  created_at: string;
}

interface StoredExpenseRow {
  id: string;
  concept: string;
  expense_type: string;
  amount: number;
  created_at: string;
}

type PeriodFilter = 'HOY' | 'SEMANA' | 'QUINCENA' | 'MES' | 'TODO';

export default function AccountingDashboard() {
  const [orders, setOrders] = useState<StoredOrderRow[]>([]);
  const [expenses, setExpenses] = useState<StoredExpenseRow[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('HOY');
  const [loading, setLoading] = useState(true);

  const loadAccountingData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const [ordersRes, expensesRes] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('is_cancelled', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('restaurant_expenses')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        if (!ordersRes.error && ordersRes.data) {
          setOrders(ordersRes.data as StoredOrderRow[]);
        }
        if (!expensesRes.error && expensesRes.data) {
          setExpenses(expensesRes.data as StoredExpenseRow[]);
        }
        setLoading(false);
        return;
      }

      const localOrders = JSON.parse(
        localStorage.getItem('castillos_orders') || '[]'
      );
      setOrders(
        localOrders.map((o: Record<string, unknown>) => ({
          id: String(o.id),
          customer_name: String(o.customerName || 'Cliente en Local'),
          order_type: (o.orderType as 'MESA' | 'DOMICILIO') || 'MESA',
          table_or_address: String(o.tableOrAddress || ''),
          items: (o.items as StoredOrderRow['items']) || [],
          total: Number(o.total || 0),
          status: String(o.status || 'PENDIENTE'),
          waiter_name: String(o.waiterName || 'Autoservicio QR'),
          created_at: new Date().toISOString(),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountingData();
  }, []);

  const isInSelectedPeriod = (isoDate: string) => {
    if (period === 'TODO') return true;
    const now = new Date();
    const recordDate = new Date(isoDate);
    const diffMs = now.getTime() - recordDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (period === 'HOY') {
      return recordDate.toDateString() === now.toDateString();
    }
    if (period === 'SEMANA') return diffDays <= 7;
    if (period === 'QUINCENA') return diffDays <= 15;
    if (period === 'MES') return diffDays <= 30;
    return true;
  };

  const filteredOrders = orders.filter((o) => isInSelectedPeriod(o.created_at));
  const filteredExpenses = expenses.filter((e) =>
    isInSelectedPeriod(e.created_at)
  );

  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  const netProfit = totalRevenue - totalExpenses;

  const totalCount = filteredOrders.length;
  const mesaRevenue = filteredOrders
    .filter((o) => o.order_type === 'MESA')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const domicilioRevenue = filteredOrders
    .filter((o) => o.order_type === 'DOMICILIO')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const productCounter: Record<string, { qty: number; revenue: number }> = {};
  filteredOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (!productCounter[item.name]) {
        productCounter[item.name] = { qty: 0, revenue: 0 };
      }
      productCounter[item.name].qty += Number(item.quantity || 1);
      productCounter[item.name].revenue +=
        Number(item.finalPrice || 0) * Number(item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productCounter)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const handleExportCSV = () => {
    const headers = [
      'Orden ID',
      'Fecha y Hora',
      'Tipo',
      'Mesa o Direccion',
      'Mesero',
      'Cliente',
      'Total COP',
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      new Date(o.created_at).toLocaleString('es-CO'),
      o.order_type,
      `"${o.table_or_address}"`,
      `"${o.waiter_name || 'QR'}"`,
      `"${o.customer_name}"`,
      o.total,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `contabilidad-castillos-${period.toLowerCase()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAccounting = async () => {
    const paso1 = confirm(
      '⚠️ ATENCIÓN DUEÑO: ¿Deseas BORRAR toda la contabilidad (ventas, comandas cerradas y gastos registrados) para iniciar desde $0?'
    );
    if (!paso1) return;

    const paso2 = prompt(
      'Por seguridad, escribe la palabra BORRAR en mayúsculas para confirmar:'
    );
    if (paso2 !== 'BORRAR') {
      alert('Operación cancelada. La contabilidad sigue intacta.');
      return;
    }

    if (supabase) {
      await Promise.all([
        supabase
          .from('orders')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase
          .from('restaurant_expenses')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
    }

    localStorage.removeItem('castillos_orders');
    await loadAccountingData();
    alert('✅ Contabilidad reiniciada a $0 correctamente.');
  };

  const periodLabels: Record<PeriodFilter, string> = {
    HOY: 'Hoy',
    SEMANA: 'Últimos 7 días',
    QUINCENA: 'Quincena (15 días)',
    MES: 'Este Mes (30 días)',
    TODO: 'Todo el Historial',
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Período y Exportación Excel */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-extrabold text-gray-500">
            <Calendar className="h-4 w-4 text-amber-600" />
            Período:
          </span>
          {(Object.keys(periodLabels) as PeriodFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                period === key
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {periodLabels[key]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadAccountingData}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-extrabold text-[#FACC15] shadow-2xs hover:bg-gray-800 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleClearAccounting}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-extrabold text-red-700 transition-colors hover:bg-red-600 hover:text-white"
            title="Borrar contabilidad y reiniciar desde $0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Borrar Contabilidad</span>
          </button>
        </div>
      </div>

      {/* 5 Tarjetas Financieras Clave: Ingresos, Gastos y Ganancia Neta Real */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">
              Ventas Totales
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">
            {formatPrice(totalRevenue)}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            {totalCount} facturas válidas
          </p>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-red-800">
              Gastos y Egresos
            </span>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-700">
            -{formatPrice(totalExpenses)}
          </p>
          <p className="mt-1 text-xs font-semibold text-red-600">
            Local, nómina y proveedores
          </p>
        </div>

        <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-amber-900">
              Ganancia Neta Real
            </span>
            <Wallet className="h-5 w-5 text-amber-600" />
          </div>
          <p
            className={`mt-2 text-2xl font-extrabold ${
              netProfit >= 0 ? 'text-gray-900' : 'text-red-600'
            }`}
          >
            {formatPrice(netProfit)}
          </p>
          <p className="mt-1 text-xs font-bold text-amber-800">
            Ingresos menos gastos
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">
              Consumo en Mesa
            </span>
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">
            {formatPrice(mesaRevenue)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {filteredOrders.filter((o) => o.order_type === 'MESA').length} mesas
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">
              Domicilios
            </span>
            <Bike className="h-5 w-5 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">
            {formatPrice(domicilioRevenue)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {filteredOrders.filter((o) => o.order_type === 'DOMICILIO').length}{' '}
            envíos
          </p>
        </div>
      </div>

      {/* Platos Más Vendidos y Registro Detallado */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Award className="h-5 w-5 text-amber-500" />
            <span>Platos Estrella ({periodLabels[period]})</span>
          </h3>

          {topProducts.length === 0 ? (
            <p className="mt-6 text-center text-xs text-gray-400">
              Aún no hay ventas registradas en este período.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topProducts.map((prod, idx) => (
                <li
                  key={prod.name}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FACC15] text-xs font-extrabold text-gray-900">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-gray-900">
                        {prod.name}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-500">
                        {prod.qty} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700">
                    {formatPrice(prod.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              <span>Historial de Ventas Válidas ({filteredOrders.length})</span>
            </h3>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400">
              No se encontraron facturas en el período seleccionado.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 font-extrabold uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Mesero</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-3 font-extrabold text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(order.created_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">
                        {order.table_or_address}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-800">
                        {order.waiter_name || 'QR'}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                        {formatPrice(Number(order.total || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
