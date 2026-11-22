'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, CartItem, WaiterProfile } from '@/types/restaurant';
import { supabase } from '@/lib/supabase';
import SpotsMap from '@/components/SpotsMap';
import {
  ChefHat,
  Wine,
  Printer,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Trash2,
  Volume2,
  Lock,
  UserCheck,
  LayoutGrid,
  FileText,
  Receipt,
} from 'lucide-react';

const CASHIER_PIN = '2026';

function announceNewOrder(
  orderId: string,
  orderType: string,
  tableOrAddress: string
) {
  try {
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
  const [role, setRole] = useState<'ADMIN' | 'WAITER' | null>(null);
  const [currentWaiter, setCurrentWaiter] = useState<WaiterProfile | null>(
    null
  );
  const [codeInput, setCodeInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'COMANDAS' | 'MESAS'>('COMANDAS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceMode, setInvoiceMode] = useState<
    'POS_LOCAL' | 'DIAN_ELECTRONICA'
  >('POS_LOCAL');

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeInput.trim();
    if (!cleanCode) return;

    if (cleanCode === CASHIER_PIN) {
      setRole('ADMIN');
      setAuthError('');
      return;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .single();

      if (!error && data) {
        setCurrentWaiter(data as WaiterProfile);
        setRole('WAITER');
        setAuthError('');
        sessionStorage.setItem('castillos_active_waiter', JSON.stringify(data));
        return;
      }
    }

    setAuthError(
      'Código inválido. Usa la clave de Cajera (2016) o código de Mesero (101-118).'
    );
  };
  useEffect(() => {
    if (!role) return;
    const client = supabase;

    const fetchOrders = async () => {
      if (client) {
        const { data, error } = await client
          .from('orders')
          .select('*')
          .eq('is_cancelled', false)
          .order('created_at', { ascending: false })
          .limit(40);

        if (!error && data) {
          const mapped: Order[] = data.map((row) => ({
            id: String(row.id),
            customerName: String(row.customer_name || 'Cliente en Local'),
            orderType: (row.order_type as 'MESA' | 'DOMICILIO') || 'MESA',
            tableOrAddress: String(row.table_or_address || ''),
            items: (row.items as CartItem[]) || [],
            total: Number(row.total || 0),
            status: (row.status as Order['status']) || 'PENDIENTE',
            waiterName: row.waiter_name
              ? String(row.waiter_name)
              : 'Autoservicio QR',
            waiterCode: row.waiter_code ? String(row.waiter_code) : undefined,
            createdAt: new Date(String(row.created_at)).toLocaleTimeString(
              'es-CO',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            ),
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
          const row = payload.new as Record<string, unknown>;
          const incoming: Order = {
            id: String(row.id),
            customerName: String(row.customer_name || 'Cliente en Local'),
            orderType: (row.order_type as 'MESA' | 'DOMICILIO') || 'MESA',
            tableOrAddress: String(row.table_or_address || ''),
            items: (row.items as CartItem[]) || [],
            total: Number(row.total || 0),
            status: (row.status as Order['status']) || 'PENDIENTE',
            waiterName: row.waiter_name
              ? String(row.waiter_name)
              : 'Autoservicio QR',
            waiterCode: row.waiter_code ? String(row.waiter_code) : undefined,
            createdAt: new Date(String(row.created_at)).toLocaleTimeString(
              'es-CO',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            ),
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
  }, [role]);

  const handleClearScreen = () => {
    localStorage.removeItem('castillos_orders');
    setOrders([]);
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  const handlePrintStationTicket = (
    order: Order,
    station: 'COCINA' | 'BARRA',
    stationItems: CartItem[]
  ) => {
    const printWindow = window.open('', '_blank', 'width=400,height=650');
    if (!printWindow) return;

    const itemsHtml = stationItems
      .map(
        (item) => `
        <div style="margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
          <div style="font-size: 17px; font-weight: bold;">
            ${item.quantity}x ${item.name}
          </div>
          ${
            item.selectedOption
              ? `<div style="font-size: 14px; font-weight: bold; margin-left: 10px;">• ${item.selectedOption}</div>`
              : ''
          }
          ${
            item.notes
              ? `<div style="font-size: 14px; font-weight: bold; margin-left: 10px; background: #eee; padding: 2px 4px;">NOTA: ${item.notes}</div>`
              : ''
          }
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda ${station} - ${order.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 76mm;
              margin: 0 auto;
              padding: 12px;
              color: #000;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            .station-badge { font-size: 20px; font-weight: bold; border: 2px solid #000; padding: 5px; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 20px; font-weight: bold;">CASTILLO'S PIZZA</div>
            <div class="station-badge">COMANDA: ${station}</div>
            <div style="font-size: 14px;">Orden: <strong>#${order.id}</strong> | ${order.createdAt}</div>
            <div style="font-size: 16px; margin-top: 4px; font-weight: bold;">
              ${order.orderType}: ${order.tableOrAddress}
            </div>
            <div style="font-size: 13px;">Atendido por: <strong>${order.waiterName || 'Autoservicio QR'}</strong></div>
            <div style="font-size: 13px;">Cliente: ${order.customerName}</div>
          </div>
          <div>${itemsHtml}</div>
          <div style="text-align: center; margin-top: 14px; font-size: 13px; font-weight: bold;">
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

  const handlePrintUnifiedInvoice = (
    order: Order,
    type: 'POS_LOCAL' | 'DIAN_ELECTRONICA'
  ) => {
    const printWindow = window.open('', '_blank', 'width=420,height=750');
    if (!printWindow) return;

    const docTitle =
      type === 'DIAN_ELECTRONICA'
        ? 'FACTURA ELECTRÓNICA DE VENTA (DIAN)'
        : 'COMPROBANTE DE VENTA POS LOCAL';

    const buildReceiptCopy = (copyLabel: string) => `
      <div style="page-break-after: always; padding-bottom: 18px; border-bottom: 3px double #000; margin-bottom: 18px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="font-size: 21px; font-weight: bold;">CASTILLO'S PIZZA</div>
          <div style="font-size: 12px; font-weight: bold;">NIT: 900.000.000-1 | Bucaramanga, Santander</div>
          <div style="font-size: 13px; font-weight: bold; border: 2px solid #000; padding: 4px; margin: 6px 0;">
            ${docTitle}
          </div>
          <div style="font-size: 12px; font-weight: bold; background: #000; color: #fff; padding: 2px;">
            *** ${copyLabel} ***
          </div>
        </div>

        <div style="font-size: 13px; line-height: 1.5; margin-bottom: 10px;">
          <div><strong>Factura / Orden:</strong> #${order.id}</div>
          <div><strong>Fecha y Hora:</strong> ${new Date().toLocaleDateString('es-CO')} ${order.createdAt}</div>
          <div><strong>Destino:</strong> ${order.orderType} - ${order.tableOrAddress}</div>
          <div><strong>Cliente:</strong> ${order.customerName}</div>
          <div><strong>Mesero:</strong> ${order.waiterName || 'Autoservicio QR'}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 10px;">
          <thead>
            <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000;">
              <th style="text-align: left; padding: 4px 0;">Cant / Descripción</th>
              <th style="text-align: right; padding: 4px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px dashed #999;">
                <td style="padding: 5px 0;">
                  <strong>${item.quantity}x ${item.name}</strong>
                  ${item.selectedOption ? `<br/><span style="font-size: 11px;">• ${item.selectedOption}</span>` : ''}
                </td>
                <td style="text-align: right; vertical-align: top; padding: 5px 0; font-weight: bold;">
                  ${formatPrice(item.finalPrice * item.quantity)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="border-top: 2px solid #000; padding-top: 8px; text-align: right; font-size: 18px; font-weight: bold;">
          TOTAL A PAGAR: ${formatPrice(order.total)}
        </div>

        <div style="text-align: center; margin-top: 12px; font-size: 12px;">
          ¡Gracias por preferir Castillo's Pizza!<br/>
          Sabor de Otro Nivel
        </div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura Unificada #${order.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 76mm;
              margin: 0 auto;
              padding: 10px;
              color: #000;
            }
          </style>
        </head>
        <body>
          ${buildReceiptCopy('COPIA 1: ARCHIVO LOCAL / CAJA')}
          ${buildReceiptCopy('COPIA 2: CLIENTE')}
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

  useEffect(() => {
    if (!role || !supabase) return;
    const client = supabase;

    const printChannel = client
      .channel('castillos-remote-print')
      .on('broadcast', { event: 'PRINT_ORDER' }, (payload) => {
        const incomingOrder = payload.payload?.order as Order | undefined;
        if (incomingOrder) {
          handlePrintUnifiedInvoice(incomingOrder, invoiceMode);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(printChannel);
    };
  }, [role, invoiceMode]);
  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Puesto de Caja y Comandas
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Ingresa la clave de <strong>Cajera (2026)</strong> o tu código de{' '}
            <strong>Mesero (101 - 118)</strong>
          </p>

          <form onSubmit={handleStaffLogin} className="mt-6 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 text-center text-2xl font-extrabold tracking-[0.4em] text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
              autoFocus
            />

            {authError && (
              <p className="text-xs font-bold text-red-600">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#FACC15] py-3.5 text-sm font-extrabold text-gray-900 shadow-sm hover:bg-amber-400"
            >
              Ingresar a Caja / Comandas
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
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-amber-300 hover:bg-amber-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Tomar Pedido</span>
              </Link>

              <div className="relative h-10 w-24">
                <Image
                  src="/logo-castillos.png"
                  alt="Castillo's Pizza"
                  fill
                  className="object-contain"
                />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {role === 'ADMIN'
                    ? 'Cajera / Punto de Venta'
                    : `Mesero: ${currentWaiter?.name} (#${currentWaiter?.code})`}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => announceNewOrder('CP-1024', 'MESA', 'Mesa 5')}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-extrabold text-amber-800 hover:bg-amber-100"
              >
                <Volume2 className="h-4 w-4 text-amber-600" />
                <span>Probar Voz</span>
              </button>

              {role === 'ADMIN' && orders.length > 0 && (
                <button
                  onClick={handleClearScreen}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Despejar Pantalla</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-2.5">
            <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-100/80 p-1">
              <button
                onClick={() => setActiveTab('COMANDAS')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'COMANDAS'
                    ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Comandas y Facturación</span>
              </button>

              <button
                onClick={() => setActiveTab('MESAS')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'MESAS'
                    ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Mapa 36 Mesas y Barra</span>
              </button>
            </div>

            {activeTab === 'COMANDAS' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-500">Tipo Factura:</span>
                <select
                  value={invoiceMode}
                  onChange={(e) =>
                    setInvoiceMode(
                      e.target.value as 'POS_LOCAL' | 'DIAN_ELECTRONICA'
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-800 focus:border-amber-400 focus:outline-none"
                >
                  <option value="POS_LOCAL">POS Punto de Venta Local</option>
                  <option value="DIAN_ELECTRONICA">
                    Factura Electrónica DIAN
                  </option>
                </select>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'MESAS' ? (
          <SpotsMap />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-400" />
            <h2 className="text-lg font-extrabold text-gray-800">
              No hay comandas pendientes en este momento
            </h2>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Cuando un cliente o mesero confirme un pedido, aparecerá aquí con
              tickets separados y factura unificada.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-[#FACC15] px-6 py-2.5 text-xs font-extrabold text-gray-900 shadow-xs hover:bg-amber-400"
            >
              Ir a tomar un pedido
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-xl bg-[#FACC15] px-3 py-1 text-sm font-extrabold text-gray-900">
                        Orden #{order.id}
                      </span>
                      <span className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-extrabold text-gray-800">
                        {order.orderType}: {order.tableOrAddress}
                      </span>
                      <span className="rounded-lg bg-amber-100/70 px-2.5 py-1 text-xs font-bold text-amber-900">
                        Atiende: {order.waiterName || 'Autoservicio QR'}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        Cliente: <strong>{order.customerName}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() =>
                          handlePrintUnifiedInvoice(order, invoiceMode)
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-98"
                        title="Imprime el total completo en 2 copias: Local y Cliente"
                      >
                        <Receipt className="h-3.5 w-3.5 text-[#FACC15]" />
                        <span>
                          Factura Total ({formatPrice(order.total)}) • 2 Copias
                        </span>
                      </button>

                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>{order.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                    {/* COLUMNA 1: ESTACIÓN COCINA */}
                    <div className="flex flex-col justify-between p-6">
                      <div>
                        <div className="mb-4 flex items-center gap-2">
                          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <ChefHat className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                              Comanda Cocina (Comida)
                            </h3>
                            <p className="text-xs text-gray-500">
                              {foodItems.length} ítem(s) para preparar
                            </p>
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
                          <span>Imprimir Comanda Cocina</span>
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
                                Comanda Barra (Bebidas)
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
                          <span>Imprimir Comanda Bebidas</span>
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
