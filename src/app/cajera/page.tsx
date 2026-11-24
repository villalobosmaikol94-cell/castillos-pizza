'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react';

const RESTAURANT_NIT = '1099365552-1';
const CASHIER_PIN = '2016';
const OWNER_PIN = '1989';

interface ActiveOrder {
  id: string;
  customer_name: string;
  order_type: 'MESA' | 'DOMICILIO';
  table_or_address: string;
  items: {
    name: string;
    quantity: number;
    finalPrice: number;
  }[];
  total: number;
  status: string;
  waiter_name?: string;
  created_at: string;
}

interface GeneratedInvoice {
  invoiceNumber: string;
  order: ActiveOrder;
  paymentMethod: string;
  paidAt: string;
}

export default function CajaPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [isCharging, setIsCharging] = useState(false);
  const [printedInvoice, setPrintedInvoice] =
    useState<GeneratedInvoice | null>(null);

  const loadPendingOrders = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('is_cancelled', false)
      .neq('status', 'COBRADO')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as ActiveOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!unlocked) return;
    loadPendingOrders();

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('realtime-caja-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadPendingOrders()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [unlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.trim();
    if (clean === CASHIER_PIN || clean === OWNER_PIN) {
      setUnlocked(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Clave de caja incorrecta.');
      setPinInput('');
    }
  };
  const handleConfirmPaymentAndInvoice = async () => {
    if (!selectedOrder) return;
    setIsCharging(true);

    try {
      if (supabase) {
        await supabase
          .from('orders')
          .update({
            status: 'COBRADO',
            kitchen_status: 'DESPACHADO',
          })
          .eq('id', selectedOrder.id);

        if (selectedOrder.order_type === 'MESA') {
          const match = selectedOrder.table_or_address.match(/\d+/);
          if (match) {
            const spotNum = Number(match[0]);
            const isBar = selectedOrder.table_or_address
              .toLowerCase()
              .includes('barra');
            await supabase
              .from('restaurant_spots')
              .update({
                status: 'DISPONIBLE',
                updated_at: new Date().toISOString(),
              })
              .eq('spot_number', spotNum)
              .eq('spot_type', isBar ? 'BARRA' : 'MESA');
          }
        }
      }

      const invoiceData: GeneratedInvoice = {
        invoiceNumber: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
        order: selectedOrder,
        paymentMethod,
        paidAt: new Date().toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setPrintedInvoice(invoiceData);
      setSelectedOrder(null);
      await loadPendingOrders();
    } finally {
      setIsCharging(false);
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Caja y Facturación
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Castillo&apos;s Pizza • NIT {RESTAURANT_NIT}
          </p>

          <form onSubmit={handleUnlock} className="mt-6 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 text-center text-2xl font-extrabold tracking-[0.4em] text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
            />
            {pinError && (
              <p className="text-xs font-bold text-red-600">{pinError}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-[#FACC15] hover:bg-gray-800"
            >
              Ingresar a Caja
            </button>
          </form>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al Menú Público</span>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-amber-400"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Menú</span>
            </Link>

            <div className="relative h-10 w-24">
              <Image
                src="/logo-castillos.png"
                alt="Castillo's Pizza"
                fill
                className="object-contain"
              />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-extrabold text-[#FACC15]">
                <Receipt className="h-3.5 w-3.5" />
                <span>Módulo Cajera</span>
              </span>
              <span className="ml-2 text-xs font-bold text-gray-500">
                NIT {RESTAURANT_NIT}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadPendingOrders}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gray-800 hover:border-amber-400"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
            <span>Actualizar ({orders.length})</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
          <h2 className="text-lg font-extrabold text-gray-900">
            Cuentas Activas por Cobrar ({orders.length})
          </h2>
          <p className="text-xs text-gray-500">
            Visualiza en tiempo real todo lo pedido en mesas, barras y
            domicilios para registrar el pago y emitir factura con NIT
          </p>

          {loading ? (
            <p className="py-10 text-center text-xs font-bold text-gray-400">
              Cargando cuentas abiertas...
            </p>
          ) : orders.length === 0 ? (
            <p className="py-10 text-center text-xs text-gray-400">
              No hay mesas o pedidos pendientes por cobrar en este momento.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((ord) => (
                <article
                  key={ord.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-extrabold text-[#FACC15]">
                        {ord.table_or_address}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500">
                        #{ord.id}
                      </span>
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-gray-900">
                      <Users className="h-3.5 w-3.5 text-amber-600" />
                      <span>{ord.customer_name}</span>
                    </p>
                    {ord.waiter_name && (
                      <p className="text-[11px] text-gray-500">
                        Atendió: <strong>{ord.waiter_name}</strong>
                      </p>
                    )}

                    <ul className="mt-3 space-y-1 border-t border-gray-200 pt-2.5 text-xs">
                      {(ord.items || []).map((item, idx) => (
                        <li
                          key={`${item.name}-${idx}`}
                          className="flex items-center justify-between text-gray-800"
                        >
                          <span>
                            <strong>{item.quantity}x</strong> {item.name}
                          </span>
                          <span className="font-bold">
                            {formatPrice(item.finalPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">
                        Total a Cobrar:
                      </span>
                      <span className="text-lg font-extrabold text-emerald-700">
                        {formatPrice(Number(ord.total || 0))}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setPaymentMethod('Efectivo');
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] py-2.5 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Cobrar y Generar Factura</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <ShoppingBag className="h-5 w-5 text-amber-500" />
              <span>Confirmar Pago • {selectedOrder.table_or_address}</span>
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              NIT {RESTAURANT_NIT} • Al confirmar se emitirá la factura y se
              liberará la mesa.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Método de Pago del Cliente:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Efectivo', 'QR Bold / Nequi', 'Datáfono'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-xl border py-2.5 text-xs font-extrabold transition-all ${
                      paymentMethod === method
                        ? 'border-gray-900 bg-gray-900 text-[#FACC15]'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-400'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50/70 p-4 text-center">
              <span className="block text-xs font-bold text-gray-500">
                Total Factura
              </span>
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(Number(selectedOrder.total || 0))}
              </span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-extrabold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isCharging}
                onClick={handleConfirmPaymentAndInvoice}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isCharging ? 'Procesando...' : 'Cobrar y Emitir Factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printedInvoice && (
        <div
          onClick={() => setPrintedInvoice(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border-2 border-amber-400 bg-white p-6 shadow-2xl"
          >
            <div className="border-b border-dashed border-gray-300 pb-4 text-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PAGO REGISTRADO Y MESA LIBERADA</span>
              </div>
              <h3 className="mt-2 text-lg font-extrabold uppercase text-gray-900">
                Castillo&apos;s Pizza
              </h3>
              <p className="text-xs font-extrabold text-gray-700">
                NIT: {RESTAURANT_NIT}
              </p>
              <p className="text-[11px] text-gray-500">
                Bucaramanga, Santander • Factura {printedInvoice.invoiceNumber}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Fecha: {printedInvoice.paidAt}
              </p>
            </div>

            <div className="my-3 space-y-1 border-b border-dashed border-gray-300 pb-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-bold text-gray-900">
                  {printedInvoice.order.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ubicación:</span>
                <span className="font-bold text-gray-900">
                  {printedInvoice.order.table_or_address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de Pago:</span>
                <span className="font-extrabold text-emerald-700">
                  {printedInvoice.paymentMethod}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3 text-xs">
              {printedInvoice.order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-gray-800">
                  <span>
                    {it.quantity}x {it.name}
                  </span>
                  <span className="font-bold">
                    {formatPrice(it.finalPrice * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-base font-extrabold text-gray-900">
              <span>TOTAL PAGADO:</span>
              <span>{formatPrice(Number(printedInvoice.order.total || 0))}</span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-3 text-xs font-extrabold text-[#FACC15] hover:bg-gray-800"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Factura</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintedInvoice(null)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-extrabold text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
