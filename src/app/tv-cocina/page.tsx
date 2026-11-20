'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CartItem } from '@/types/restaurant';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Volume2,
  Maximize2,
  User,
} from 'lucide-react';

interface KitchenOrder {
  id: string;
  customerName: string;
  orderType: 'MESA' | 'DOMICILIO';
  tableOrAddress: string;
  items: CartItem[];
  waiterName: string;
  kitchenStatus: 'EN_COLA' | 'PREPARANDO' | 'DESPACHADO';
  createdAtRaw: string;
}

function announceOrderReady(orderId: string, destination: string) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanNumber = orderId.replace('CP-', '');
      const msg = new SpeechSynthesisUtterance(
        `Orden número ${cleanNumber}, ${destination}, lista para entregar`
      );
      msg.lang = 'es-CO';
      msg.rate = 1.02;
      window.speechSynthesis.speak(msg);
    }
  } catch {
    // Ignorar si el navegador bloquea voz automática
  }
}

export default function TvCocinaPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [now, setNow] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Reloj interno cada 10 segundos para actualizar los minutos de espera
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);


  const loadActiveKitchenOrders = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('is_cancelled', false)
      .neq('kitchen_status', 'DESPACHADO')
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped: KitchenOrder[] = data
        .map((row) => ({
          id: String(row.id),
          customerName: String(row.customer_name || 'Cliente'),
          orderType: (row.order_type as 'MESA' | 'DOMICILIO') || 'MESA',
          tableOrAddress: String(row.table_or_address || ''),
          items: ((row.items as CartItem[]) || []).filter(
            (i) => i.station === 'COCINA'
          ),
          waiterName: row.waiter_name
            ? String(row.waiter_name)
            : 'Autoservicio QR',
          kitchenStatus:
            (row.kitchen_status as KitchenOrder['kitchenStatus']) || 'EN_COLA',
          createdAtRaw: String(row.created_at),
        }))
        .filter((o) => o.items.length > 0);

      setOrders(mapped);
    }
  };

  useEffect(() => {
    loadActiveKitchenOrders();

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('tv-kitchen-kds')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadActiveKitchenOrders();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  const handleAdvanceStatus = async (order: KitchenOrder) => {
    const nextStatus: KitchenOrder['kitchenStatus'] =
      order.kitchenStatus === 'EN_COLA' ? 'PREPARANDO' : 'DESPACHADO';

    setOrders((prev) =>
      nextStatus === 'DESPACHADO'
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) =>
            o.id === order.id ? { ...o, kitchenStatus: nextStatus } : o
          )
    );

    if (nextStatus === 'DESPACHADO' && soundEnabled) {
      announceOrderReady(order.id, order.tableOrAddress);
    }

    if (supabase) {
      await supabase
        .from('orders')
        .update({ kitchen_status: nextStatus })
        .eq('id', order.id);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

    const getElapsedMinutes = (isoDate: string) => {
    if (!now) return 0;
    const diff = Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / 60000));
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      {/* Cabecera de Control para TV de Cocina */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-800 bg-gray-900/90 px-6 py-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-28 rounded-xl bg-white p-1.5">
            <Image
              src="/logo-castillos.png"
              alt="Castillo's Pizza"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold tracking-tight text-[#FACC15]">
              <ChefHat className="h-7 w-7" />
              <span>MONITOR DE COCINA (KDS) • POR TURNOS</span>
            </h1>
            <p className="text-xs font-medium text-gray-400">
              Ordenado automáticamente por llegada • Actualización en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 px-4 py-2 text-center">
            <span className="block text-[10px] font-bold uppercase text-gray-400">
              Turnos Activos
            </span>
            <span className="text-2xl font-extrabold text-[#FACC15]">
              {orders.length}
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold transition-all ${
              soundEnabled
                ? 'bg-emerald-500 text-gray-950'
                : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>{soundEnabled ? 'Voz Activada' : 'Activar Voz'}</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 text-xs font-extrabold text-gray-200 hover:bg-gray-700"
            title="Pantalla Completa en TV"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">Pantalla Completa</span>
          </button>
        </div>
      </header>

      {/* Cuadrícula de Turnos Gigantes para TV */}
      {orders.length === 0 ? (
        <div className="flex h-[70vh] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-800 bg-gray-900/40 text-center">
          <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-400" />
          <h2 className="text-2xl font-extrabold text-white">
            Cocina al día • Sin turnos pendientes
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Los nuevos pedidos aparecerán automáticamente en pantalla por orden de llegada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order, index) => {
            const elapsed = getElapsedMinutes(order.createdAtRaw);
            const isUrgent = elapsed >= 18;
            const isWarning = elapsed >= 10 && elapsed < 18;

            const headerColor = isUrgent
              ? 'bg-red-600 text-white animate-pulse'
              : isWarning
              ? 'bg-amber-500 text-gray-950'
              : order.kitchenStatus === 'PREPARANDO'
              ? 'bg-sky-500 text-gray-950'
              : 'bg-emerald-500 text-gray-950';

            return (
              <article
                key={order.id}
                className={`flex flex-col justify-between overflow-hidden rounded-3xl border-2 bg-gray-900 shadow-2xl ${
                  isUrgent
                    ? 'border-red-500'
                    : order.kitchenStatus === 'PREPARANDO'
                    ? 'border-sky-400'
                    : 'border-gray-700'
                }`}
              >
                <div>
                  {/* Cabecera del Turno con Semáforo */}
                  <div className={`px-5 py-3.5 ${headerColor}`}>
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-black/20 px-2.5 py-0.5 text-xs font-extrabold uppercase">
                        TURNO #{index + 1}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-extrabold">
                        <Clock className="h-4 w-4" />
                        {elapsed} min
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between">
                      <h2 className="text-2xl font-extrabold tracking-tight">
                        {order.tableOrAddress}
                      </h2>
                      <span className="text-sm font-extrabold opacity-90">
                        #{order.id}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-xs font-bold opacity-90">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {order.waiterName}
                      </span>
                      <span>{order.orderType}</span>
                    </div>
                  </div>

                  {/* Lista Gigante de Platos a Preparar */}
                  <ul className="divide-y divide-gray-800 p-4">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-8 min-w-[32px] items-center justify-center rounded-xl bg-[#FACC15] text-lg font-extrabold text-gray-950">
                            {item.quantity}
                          </span>
                          <div>
                            <p className="text-lg font-extrabold leading-snug text-white">
                              {item.name}
                            </p>
                            {item.selectedOption && (
                              <p className="mt-0.5 text-sm font-bold text-amber-400">
                                • {item.selectedOption}
                              </p>
                            )}
                            {item.notes && (
                              <p className="mt-1 rounded-lg bg-red-950/90 border border-red-700 px-2.5 py-1 text-sm font-extrabold text-red-200">
                                ⚠️ {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón de Cambio de Estado */}
                <div className="border-t border-gray-800 bg-gray-950/60 p-4">
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-extrabold uppercase tracking-wider transition-all active:scale-95 ${
                      order.kitchenStatus === 'EN_COLA'
                        ? 'bg-[#FACC15] text-gray-950 hover:bg-amber-400'
                        : 'bg-emerald-500 text-gray-950 hover:bg-emerald-400'
                    }`}
                  >
                    {order.kitchenStatus === 'EN_COLA' ? (
                      <>
                        <Flame className="h-5 w-5" />
                        <span>Empezar a Preparar</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Marcar como Despachado</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
