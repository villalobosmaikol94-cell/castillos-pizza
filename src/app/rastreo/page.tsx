'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Clock,
  Flame,
  Bike,
  CheckCircle2,
  Search,
  Sparkles,
  UtensilsCrossed,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

interface TrackedOrder {
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
  kitchen_status?: string;
  waiter_name?: string;
  created_at: string;
}

function RastreoContent() {
  const searchParams = useSearchParams();
  const initialOrden = searchParams.get('orden') || '';

  const [orderInput, setOrderInput] = useState(initialOrden);
  const [activeOrderId, setActiveOrderId] = useState(initialOrden);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const normalizeCode = (raw: string) => {
    const clean = raw.trim().toUpperCase();
    if (!clean) return '';
    return clean.startsWith('CP-') ? clean : `CP-${clean}`;
  };

  const fetchOrder = async (rawCode: string) => {
    const code = normalizeCode(rawCode);
    if (!code) return;

    setLoading(true);
    setNotFound(false);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', code)
          .single();

        if (!error && data) {
          setOrder(data as TrackedOrder);
          setActiveOrderId(code);
          return;
        }
      }

      const localOrders = JSON.parse(
        localStorage.getItem('castillos_orders') || '[]'
      );
      const foundLocal = localOrders.find(
        (o: Record<string, unknown>) =>
          String(o.id).toUpperCase() === code
      );

      if (foundLocal) {
        setOrder({
          id: String(foundLocal.id),
          customer_name: String(foundLocal.customerName || 'Cliente'),
          order_type:
            (foundLocal.orderType as 'MESA' | 'DOMICILIO') || 'DOMICILIO',
          table_or_address: String(foundLocal.tableOrAddress || ''),
          items: (foundLocal.items as TrackedOrder['items']) || [],
          total: Number(foundLocal.total || 0),
          status: String(foundLocal.status || 'EN_COLA'),
          kitchen_status: String(foundLocal.kitchenStatus || 'EN_COLA'),
          created_at: new Date().toISOString(),
        });
        setActiveOrderId(code);
      } else {
        setOrder(null);
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedLast =
      initialOrden || localStorage.getItem('castillos_last_order_id') || '';
    if (savedLast) {
      setOrderInput(savedLast);
      fetchOrder(savedLast);
    }
  }, [initialOrden]);

  useEffect(() => {
    if (!activeOrderId || !supabase) return;

    const channel = supabase
      .channel(`rastreo-orden-${activeOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrderId}`,
        },
        (payload) => {
          setOrder(payload.new as TrackedOrder);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [activeOrderId]);
  const getCurrentStep = () => {
    if (!order) return 0;
    const st = (order.kitchen_status || order.status || 'EN_COLA').toUpperCase();
    if (st === 'DESPACHADO' || st === 'ENTREGADO' || st === 'LISTO') return 3;
    if (st === 'PREPARANDO') return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const stepsInfo = [
    {
      step: 1,
      title: 'Pedido Recibido en Cocina',
      desc: 'Tu orden ya ingresó al sistema de Castillo’s Pizza y está en turno.',
      icon: Clock,
    },
    {
      step: 2,
      title: '¡Manos a la Masa! Preparando',
      desc: 'Nuestros pizzeros están preparando y horneando tu pedido al instante.',
      icon: Flame,
    },
    {
      step: 3,
      title:
        order?.order_type === 'DOMICILIO'
          ? '¡Listo! Despachado a tu Domicilio'
          : '¡Listo! Saliendo hacia tu Mesa',
      desc:
        order?.order_type === 'DOMICILIO'
          ? 'Tu pedido salió de cocina y va en camino hacia tu dirección.'
          : 'Tu pedido salió de cocina y nuestro mesero ya va hacia tu mesa.',
      icon: order?.order_type === 'DOMICILIO' ? Bike : UtensilsCrossed,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-white">
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090A0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-white/5 px-3.5 py-2 text-xs font-extrabold text-amber-200 hover:border-amber-400"
          >
            <ArrowLeft className="h-4 w-4 text-amber-400" />
            <span>Volver al Menú</span>
          </Link>

          <div className="relative h-10 w-24 rounded-xl bg-white/95 p-1.5">
            <Image
              src="/logo-castillos.png"
              alt="Castillo's Pizza"
              fill
              className="object-contain"
            />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            <span>EN VIVO</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-3xl border border-amber-500/25 bg-[#11131B] p-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span>Seguimiento en Tiempo Real</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-white">
            Rastrea tu Pedido Castillo&apos;s
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Ingresa el número de tu orden (Ej: CP-1024) para ver el estado en
            cocina al instante.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOrder(orderInput);
            }}
            className="mt-4 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Código de orden (Ej: CP-1234)"
                className="w-full rounded-2xl border border-amber-500/30 bg-black/60 py-3 pl-10 pr-4 text-sm font-extrabold uppercase text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-gray-950 shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Rastrear'}
            </button>
          </form>

          {notFound && (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-xs font-bold text-red-300">
              No encontramos una orden con ese código. Verifica el número en tu
              comprobante.
            </p>
          )}
        </div>
        {order && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#151722] to-[#0D0E14] p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-extrabold text-amber-300">
                    ORDEN #{order.id}
                  </span>
                  <h2 className="mt-2 text-lg font-extrabold text-white">
                    {order.customer_name}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {order.order_type === 'DOMICILIO' ? 'Domicilio:' : 'Mesa:'}{' '}
                    <strong className="text-zinc-200">
                      {order.table_or_address}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchOrder(order.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-amber-400 hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {stepsInfo.map((st, idx) => {
                  const IconComponent = st.icon;
                  const isCompleted = currentStep > st.step;
                  const isCurrent = currentStep === st.step;

                  return (
                    <div key={st.step} className="relative flex gap-4">
                      {idx < stepsInfo.length - 1 && (
                        <div
                          className={`absolute top-11 left-5 h-10 w-0.5 ${
                            isCompleted ? 'bg-emerald-400' : 'bg-zinc-800'
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                          isCompleted
                            ? 'border-emerald-400 bg-emerald-500 text-gray-950'
                            : isCurrent
                            ? 'border-amber-300 bg-gradient-to-br from-[#FDE047] to-[#D97706] text-gray-950 shadow-[0_0_25px_rgba(250,204,21,0.45)]'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <IconComponent
                            className={`h-5 w-5 ${
                              isCurrent ? 'animate-bounce' : ''
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm font-extrabold ${
                              isCompleted || isCurrent
                                ? 'text-white'
                                : 'text-zinc-500'
                            }`}
                          >
                            {st.title}
                          </h3>
                          {isCurrent && (
                            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-300">
                              Ahora
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            isCompleted || isCurrent
                              ? 'text-zinc-300'
                              : 'text-zinc-600'
                          }`}
                        >
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#11131B] p-6">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
                <span>Resumen de tu Pedido</span>
              </h3>

              <div className="mt-4 divide-y divide-white/10 text-xs">
                {(order.items || []).map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span className="text-zinc-200">
                      <strong className="text-amber-300">
                        {item.quantity}x
                      </strong>{' '}
                      {item.name}
                    </span>
                    <span className="font-bold text-zinc-300">
                      {formatPrice(item.finalPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-amber-500/25 pt-3">
                <span className="text-xs font-extrabold uppercase text-amber-300">
                  Total Pedido
                </span>
                <span className="text-lg font-extrabold text-amber-300">
                  {formatPrice(Number(order.total || 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RastreoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#090A0F] text-xs font-bold text-amber-300">
          Cargando rastreador en vivo...
        </div>
      }
    >
      <RastreoContent />
    </Suspense>
  );
}
