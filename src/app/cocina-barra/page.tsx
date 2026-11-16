'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, CartItem } from '@/types/restaurant';
import { supabase } from '@/lib/supabase';
import {
  ChefHat,
  Wine,
  Printer,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Trash2,
  Volume2,
} from 'lucide-react';

function announceNewOrder(
  orderId: string,
  orderType: string,
  tableOrAddress: string
) {
  try {
    // 1. Timbre suave inicial de atención
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);

    // 2. Anuncio hablado claro en español
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanNumber = orderId.replace('CP-', '');
      const destinationText =
        orderType === 'MESA' ? `para ${tableOrAddress}` : 'a domicilio';

      const message = new SpeechSynthesisUtterance(
        `Nueva orden número ${cleanNumber}, ${destinationText}`
      );
      message.lang = 'es-CO';
      message.rate = 1.02;
      message.pitch = 1.05;

      setTimeout(() => {
        window.speechSynthesis.speak(message);
      }, 300);
    }
  } catch {
    // Ignorar si el navegador requiere interacción previa
  }
}

export default function CocinaBarraPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const client = supabase;

    const fetchOrders = async () => {
      if (client) {
        const { data, error } = await client
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (!error && data) {
          const mapped: Order[] = data.map((row) => ({
            id: row.id,
            customerName: row.customer_name,
            orderType: row.order_type,
            tableOrAddress: row.table_or_address,
            items: row.items,
            total: Number(row.total),
            status: row.status,
            createdAt: new Date(row.created_at).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
          setOrders(mapped);
          return;
        }
      }

      const saved = JSON.parse(
        localStorage.getItem('castillos_orders') || '[]'
      );
      setOrders(saved);
    };

    fetchOrders();

    if (!client) return;

    const channel = client
      .channel('realtime-castillos-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const row = payload.new;
          const incoming: Order = {
            id: row.id,
            customerName: row.customer_name,
            orderType: row.order_type,
            tableOrAddress: row.table_or_address,
            items: row.items,
            total: Number(row.total),
            status: row.status,
            createdAt: new Date(row.created_at).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };

          setOrders((prev) =>
            prev.some((o) => o.id === incoming.id) ? prev : [incoming, ...prev]
          );
          announceNewOrder(
            incoming.id,
            incoming.orderType,
            incoming.tableOrAddress
          );
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);
  const handleClearHistory = async () => {
    localStorage.removeItem('castillos_orders');
    if (supabase) {
      await supabase.from('orders').delete().neq('id', '');
    }
    setOrders([]);
  };

  const handlePrintStationTicket = (
    order: Order,
    station: 'COCINA' | 'BARRA',
    stationItems: CartItem[]
  ) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const itemsHtml = stationItems
      .map(
        (item) => `
        <div style="margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 6px;">
          <div style="font-size: 15px; font-weight: bold;">
            ${item.quantity}x ${item.name}
          </div>
          ${
            item.selectedOption
              ? `<div style="font-size: 13px; margin-left: 12px;">• ${item.selectedOption}</div>`
              : ''
          }
          ${
            item.notes
              ? `<div style="font-size: 13px; font-weight: bold; margin-left: 12px;">NOTA: ${item.notes}</div>`
              : ''
          }
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket ${station} - ${order.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 10px;
              color: #000;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            .station-badge { font-size: 18px; font-weight: bold; border: 2px solid #000; padding: 4px; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 18px; font-weight: bold;">CASTILLO'S PIZZA</div>
            <div class="station-badge">ESTACIÓN: ${station}</div>
            <div style="font-size: 13px;">Orden: <strong>${order.id}</strong> | Hora: ${order.createdAt}</div>
            <div style="font-size: 14px; margin-top: 4px;">
              <strong>${order.orderType}:</strong> ${order.tableOrAddress}
            </div>
            <div style="font-size: 12px;">Cliente: ${order.customerName}</div>
          </div>
          <div>${itemsHtml}</div>
          <div style="text-align: center; margin-top: 14px; font-size: 12px;">
            --- FIN COMANDA ${station} ---
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      {/* Cabecera Luminosa del Panel Operativo */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-amber-300 hover:bg-amber-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Menú</span>
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
              <h1 className="text-base font-extrabold text-gray-900 sm:text-lg">
                Central de Comandas Separadas
              </h1>
              <p className="text-xs text-gray-500">
                Impresión independiente: Cocina vs. Barra / Bebidas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => announceNewOrder('CP-1024', 'MESA', 'Mesa 5')}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-extrabold text-amber-800 hover:bg-amber-100"
              title="Desbloquea y prueba el anuncio por voz"
            >
              <Volume2 className="h-4 w-4 text-amber-600" />
              <span>Probar Voz</span>
            </button>

            {orders.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpiar Historial</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tablero de Órdenes */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-400" />
            <h2 className="text-lg font-extrabold text-gray-800">
              No hay comandas pendientes en este momento
            </h2>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Cuando un cliente o mesero confirme un pedido en la tienda,
              aparecerá aquí dividido automáticamente entre Cocina y Barra.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-[#FACC15] px-6 py-2.5 text-xs font-extrabold text-gray-900 shadow-xs hover:bg-amber-400"
            >
              Ir a tomar un pedido de prueba
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const foodItems = order.items.filter(
                (i) => i.station === 'COCINA'
              );
              const drinkItems = order.items.filter(
                (i) => i.station === 'BARRA'
              );

              return (
                <section
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* Barra Superior de la Orden */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-xl bg-[#FACC15] px-3 py-1 text-sm font-extrabold text-gray-900">
                        Orden #{order.id}
                      </span>
                      <span className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-extrabold text-gray-800">
                        {order.orderType}: {order.tableOrAddress}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        Cliente: <strong>{order.customerName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>{order.createdAt}</span>
                    </div>
                  </div>

                  {/* Dos Columnas Independientes: COCINA vs BARRA */}
                  <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                    {/* COLUMNA 1: ESTACIÓN COCINA */}
                    <div className="flex flex-col justify-between p-6">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                              <ChefHat className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                                Ticket Cocina (Comida)
                              </h3>
                              <p className="text-xs text-gray-500">
                                {foodItems.length} ítem(s) para preparar
                              </p>
                            </div>
                          </div>
                        </div>

                        {foodItems.length === 0 ? (
                          <p className="rounded-xl bg-gray-50 p-4 text-center text-xs font-medium text-gray-400">
                            Este pedido no incluye comida.
                          </p>
                        ) : (
                          <ul className="space-y-2.5">
                            {foodItems.map((item, idx) => (
                              <li
                                key={idx}
                                className="rounded-xl border border-amber-100 bg-amber-50/40 p-3"
                              >
                                <div className="text-sm font-extrabold text-gray-900">
                                  {item.quantity}x {item.name}
                                </div>
                                {item.selectedOption && (
                                  <div className="mt-0.5 text-xs font-bold text-amber-700">
                                    • {item.selectedOption}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="mt-1 rounded-md border border-red-100 bg-white px-2 py-1 text-xs font-semibold text-red-600">
                                    Nota: {item.notes}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {foodItems.length > 0 && (
                        <button
                          onClick={() =>
                            handlePrintStationTicket(
                              order,
                              'COCINA',
                              foodItems
                            )
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] py-3 text-xs font-extrabold uppercase tracking-wider text-gray-900 shadow-xs transition-all hover:bg-amber-400 active:scale-98"
                        >
                          <Printer className="h-4 w-4 stroke-[2.5]" />
                          <span>Imprimir Ticket Cocina</span>
                        </button>
                      )}
                    </div>
                    {/* COLUMNA 2: ESTACIÓN BARRA / BEBIDAS */}
                    <div className="flex flex-col justify-between bg-sky-50/20 p-6">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                              <Wine className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                                Ticket Barra (Bebidas)
                              </h3>
                              <p className="text-xs text-gray-500">
                                {drinkItems.length} bebida(s) separadas
                              </p>
                            </div>
                          </div>
                        </div>

                        {drinkItems.length === 0 ? (
                          <p className="rounded-xl bg-gray-50 p-4 text-center text-xs font-medium text-gray-400">
                            Este pedido no incluye bebidas.
                          </p>
                        ) : (
                          <ul className="space-y-2.5">
                            {drinkItems.map((item, idx) => (
                              <li
                                key={idx}
                                className="rounded-xl border border-sky-100 bg-white p-3 shadow-2xs"
                              >
                                <div className="text-sm font-extrabold text-gray-900">
                                  {item.quantity}x {item.name}
                                </div>
                                {item.selectedOption && (
                                  <div className="mt-0.5 text-xs font-bold text-sky-700">
                                    • {item.selectedOption}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="mt-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                                    Nota: {item.notes}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {drinkItems.length > 0 && (
                        <button
                          onClick={() =>
                            handlePrintStationTicket(
                              order,
                              'BARRA',
                              drinkItems
                            )
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs transition-all hover:bg-sky-600 active:scale-98"
                        >
                          <Printer className="h-4 w-4 stroke-[2.5]" />
                          <span>Imprimir Ticket Bebidas</span>
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
