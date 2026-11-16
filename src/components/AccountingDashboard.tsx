'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  calculateAccountingSummary,
  RawOrderRecord,
} from '@/lib/accounting';
import {
  TrendingUp,
  ShoppingBag,
  ChefHat,
  Wine,
  RotateCcw,
  Calendar,
  Receipt,
  Download,
} from 'lucide-react';

type PeriodTab = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export default function AccountingDashboard() {
  const [orders, setOrders] = useState<RawOrderRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodTab>('DIARIO');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data as RawOrderRecord[]);
          setIsLoading(false);
          return;
        }
      }

      // Respaldo local si no hay conexión a Supabase
      const localSaved = JSON.parse(
        localStorage.getItem('castillos_orders') || '[]'
      );
      const mappedLocal: RawOrderRecord[] = localSaved.map(
        (o: Record<string, unknown>) => ({
          id: String(o.id || ''),
          customer_name: String(o.customerName || 'Cliente'),
          order_type: (o.orderType as 'MESA' | 'DOMICILIO') || 'MESA',
          table_or_address: String(o.tableOrAddress || ''),
          items: (o.items as RawOrderRecord['items']) || [],
          total: Number(o.total || 0),
          status: String(o.status || 'PENDIENTE'),
          created_at: new Date().toISOString(),
        })
      );
      setOrders(mappedLocal);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const handleResetAccounting = async () => {
    const firstConfirm = confirm(
      '⚠️ ATENCIÓN: Vas a reiniciar el registro contable a $0.\n¿Estás seguro de que deseas hacer cierre y borrar el historial acumulado?'
    );
    if (!firstConfirm) return;

    setIsResetting(true);
    try {
      localStorage.removeItem('castillos_orders');
      if (supabase) {
        await supabase.from('orders').delete().neq('id', '');
      }
      setOrders([]);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = ['Orden', 'Fecha', 'Tipo', 'Mesa/Direccion', 'Cliente', 'Total'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.created_at).toLocaleString('es-CO'),
      o.order_type,
      `"${o.table_or_address}"`,
      `"${o.customer_name}"`,
      o.total,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `contabilidad-castillos-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const summary = calculateAccountingSummary(orders, selectedPeriod);
  const periods: { id: PeriodTab; label: string; sublabel: string }[] = [
    { id: 'DIARIO', label: 'Diario', sublabel: 'Ventas de hoy' },
    { id: 'SEMANAL', label: 'Semanal', sublabel: 'Últimos 7 días' },
    { id: 'QUINCENAL', label: 'Quincenal', sublabel: 'Últimos 15 días' },
    { id: 'MENSUAL', label: 'Mensual', sublabel: 'Últimos 30 días' },
  ];

  return (
    <div className="space-y-6">
      {/* Selector de Periodo Contable + Acciones */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => {
            const active = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`flex flex-col rounded-2xl px-4 py-2.5 text-left transition-all ${
                  active
                    ? 'bg-[#FACC15] text-gray-900 shadow-xs ring-2 ring-amber-400/50'
                    : 'bg-gray-50 text-gray-600 hover:bg-amber-50'
                }`}
              >
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {p.label}
                </span>
                <span className="text-[11px] font-medium opacity-80">
                  {p.sublabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-amber-600" />
            <span>Descargar Excel</span>
          </button>

          <button
            onClick={handleResetAccounting}
            disabled={isResetting || orders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{isResetting ? 'Reseteando...' : 'Resetear Caja'}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Indicadores Financieros */}
      {isLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-sm font-bold text-gray-400">
          Calculando balances de Castillo&apos;s Pizza...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Vendido */}
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                Total Vendido ({selectedPeriod})
              </span>
              <div className="rounded-xl bg-[#FACC15] p-2 text-gray-900">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {formatPrice(summary.totalSales)}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Ticket promedio: <strong>{formatPrice(summary.averageTicket)}</strong>
            </p>
          </div>

          {/* Total Pedidos */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Órdenes Atendidas
              </span>
              <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {summary.orderCount}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Pedidos en mesa y domicilios
            </p>
          </div>

          {/* Ingresos Cocina (Comida) */}
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-700">
                Ventas Cocina (Comida)
              </span>
              <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
                <ChefHat className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {formatPrice(summary.foodSales)}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Pizzas, hamburguesas, carnes, etc.
            </p>
          </div>

          {/* Ingresos Barra (Bebidas) */}
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700">
                Ventas Barra (Bebidas)
              </span>
              <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                <Wine className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {formatPrice(summary.drinkSales)}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Granizadas, jugos, gaseosas y cervezas
            </p>
          </div>
        </div>
      )}

      {/* Tabla de Últimos Movimientos */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-extrabold text-gray-900">
              Historial Reciente de Ventas
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{orders.length} registros guardados</span>
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Aún no hay ventas registradas en este periodo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-extrabold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Orden</th>
                  <th className="px-6 py-3">Fecha y Hora</th>
                  <th className="px-6 py-3">Destino</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 15).map((ord) => (
                  <tr key={ord.id} className="hover:bg-amber-50/30">
                    <td className="px-6 py-3.5 font-extrabold text-gray-900">
                      #{ord.id}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500">
                      {new Date(ord.created_at).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                        {ord.order_type}: {ord.table_or_address}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-medium text-gray-600">
                      {ord.customer_name}
                    </td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">
                      {formatPrice(Number(ord.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
