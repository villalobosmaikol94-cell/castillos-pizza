'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CartItem, Order, WaiterProfile } from '@/types/restaurant';
import { supabase } from '@/lib/supabase';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ChefHat,
  Wine,
  Send,
  UtensilsCrossed,
  Bike,
  CheckCircle2,
  MessageCircle,
  Lock,
  UserCheck,
  Printer,
} from 'lucide-react';

const RESTAURANT_WHATSAPP = '573012802801';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [orderType, setOrderType] = useState<'MESA' | 'DOMICILIO'>('MESA');
  const [customerName, setCustomerName] = useState('');
  const [tableOrAddress, setTableOrAddress] = useState('');
  const [lockedTable, setLockedTable] = useState<string | null>(null);

  // Estado para identificación de Mesero (101 - 118)
  const [waiterCodeInput, setWaiterCodeInput] = useState('');
  const [verifiedWaiter, setVerifiedWaiter] = useState<WaiterProfile | null>(null);
  const [waiterError, setWaiterError] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [remotePrintSent, setRemotePrintSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mesaParam = params.get('mesa');
      if (mesaParam) {
        const formatted = `Mesa ${mesaParam}`;
        setOrderType('MESA');
        setTableOrAddress(formatted);
        setLockedTable(formatted);
      }

      const savedWaiter = sessionStorage.getItem('castillos_active_waiter');
      if (savedWaiter) {
        const parsed = JSON.parse(savedWaiter) as WaiterProfile;
        setVerifiedWaiter(parsed);
        setWaiterCodeInput(parsed.code);
      }
    }
  }, []);

  // Valida automáticamente el código del mesero (101-118) contra Supabase
  useEffect(() => {
    const clean = waiterCodeInput.trim();
    if (!clean) {
      setVerifiedWaiter(null);
      setWaiterError('');
      return;
    }

    const timer = setTimeout(async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('code', clean)
        .eq('active', true)
        .single();

      if (!error && data) {
        const profile = data as WaiterProfile;
        setVerifiedWaiter(profile);
        setWaiterError('');
        sessionStorage.setItem('castillos_active_waiter', JSON.stringify(profile));
      } else {
        setVerifiedWaiter(null);
        setWaiterError('Código no registrado');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [waiterCodeInput]);

  if (!isOpen) return null;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const foodItems = items.filter((item) => item.station === 'COCINA');
  const drinkItems = items.filter((item) => item.station === 'BARRA');

  const totalAmount = items.reduce(
    (sum, item) => sum + item.finalPrice * item.quantity,
    0
  );
  const openWhatsAppDelivery = (order: Order) => {
    const lines = order.items.map((item) => {
      const opt = item.selectedOption ? ` (${item.selectedOption})` : '';
      const note = item.notes ? ` _[Nota: ${item.notes}]_` : '';
      return `• ${item.quantity}x ${item.name}${opt} - ${formatPrice(
        item.finalPrice * item.quantity
      )}${note}`;
    });

    const text = [
      `🍕 *NUEVO DOMICILIO CASTILLO'S PIZZA*`,
      `*Orden:* #${order.id}`,
      `*Dirección:* ${order.tableOrAddress}`,
      `*Cliente:* ${order.customerName}`,
      ``,
      `*Detalle del Pedido:*`,
      ...lines,
      ``,
      `*TOTAL A PAGAR:* ${formatPrice(order.total)}`,
    ].join('\n');

    const phoneNumber = RESTAURANT_WHATSAPP;
    const encodedMessage = encodeURIComponent(text);

       const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    const urlWeb = `https://whatsapp.com{cleanPhone}&text=${encodedMessage}`;
    const urlApp = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (esMovil) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (!document.hidden) window.location.href = urlWeb;
      }, 1500);
    } else {
      const win = window.open(urlWeb, '_blank');
      if (!win) {
        window.location.href = urlWeb;
      }
    }
  };


  // Envía señal en tiempo real a Caja (/cocina-barra) para imprimir comandas y factura
  const handleRemotePrintFromPhone = async (order: Order) => {
    if (!supabase) return;
    await supabase.channel('castillos-remote-print').send({
      type: 'broadcast',
      event: 'PRINT_ORDER',
      payload: { order },
    });
    setRemotePrintSent(true);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !tableOrAddress.trim()) return;

    setIsSending(true);
    setRemotePrintSent(false);

    const assignedWaiterName =
      orderType === 'MESA' && verifiedWaiter
        ? verifiedWaiter.name
        : orderType === 'MESA'
        ? 'Autoservicio QR'
        : 'Domicilio Web';

    const assignedWaiterCode =
      orderType === 'MESA' && verifiedWaiter ? verifiedWaiter.code : undefined;

    const newOrder: Order = {
      id: `CP-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName.trim() || 'Cliente en Local',
      orderType,
      tableOrAddress: tableOrAddress.trim(),
      items,
      total: totalAmount,
      waiterName: assignedWaiterName,
      waiterCode: assignedWaiterCode,
      createdAt: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'PENDIENTE',
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('orders').insert([
          {
            id: newOrder.id,
            customer_name: newOrder.customerName,
            order_type: newOrder.orderType,
            table_or_address: newOrder.tableOrAddress,
            items: newOrder.items,
            total: newOrder.total,
            status: newOrder.status,
            waiter_name: newOrder.waiterName,
            waiter_code: newOrder.waiterCode || null,
            is_cancelled: false,
            kitchen_status: 'EN_COLA',
          },
        ]);
        if (error) console.error('Error Supabase:', error.message);
      }

      await fetch('/api/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      const existingOrders = JSON.parse(
        localStorage.getItem('castillos_orders') || '[]'
      );
      localStorage.setItem(
        'castillos_orders',
        JSON.stringify([newOrder, ...existingOrders])
      );

      setOrderSuccess(newOrder);
            localStorage.setItem('castillos_last_order_id', newOrder.id);
      onClearCart();
      setCustomerName('');
      setTableOrAddress(lockedTable || '');

      if (newOrder.orderType === 'DOMICILIO') {
        openWhatsAppDelivery(newOrder);
      }
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
    } finally {
      setIsSending(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/30 backdrop-blur-xs transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Cabecera del Carrito */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              Tu Pedido Castillo&apos;s
            </h2>
            <p className="text-xs font-medium text-gray-500">
              Enrutamiento automático a Cocina y Barra
            </p>
          </div>
          <button
            onClick={() => {
              setOrderSuccess(null);
              onClose();
            }}
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {orderSuccess ? (
            <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <CheckCircle2 className="mb-3 h-14 w-14 text-emerald-600" />
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Orden #{orderSuccess.id} • {orderSuccess.waiterName}
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-gray-900">
                ¡Pedido Enviado con Éxito!
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {orderSuccess.orderType === 'DOMICILIO'
                  ? 'Tu domicilio ya ingresó a cocina y se abrió WhatsApp para confirmarlo.'
                  : `Pedido registrado en ${orderSuccess.tableOrAddress}. Ya llegó a Cocina y Barra.`}
              </p>

              <div className="mt-5 flex w-full flex-col gap-2.5">
                {/* Botón exclusivo para que el Mesero mande a imprimir desde su celular a Caja */}
                {orderSuccess.orderType === 'MESA' && orderSuccess.waiterCode && (
                  <button
                    type="button"
                    disabled={remotePrintSent}
                    onClick={() => handleRemotePrintFromPhone(orderSuccess)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold shadow-sm transition-all ${
                      remotePrintSent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-900 text-[#FACC15] hover:bg-gray-800'
                    }`}
                  >
                    <Printer className="h-5 w-5" />
                    <span>
                      {remotePrintSent
                        ? '✓ Orden de Impresión Enviada a Caja'
                        : 'Mandar a Imprimir Factura en Caja'}
                    </span>
                  </button>
                )}

                               {orderSuccess.orderType === 'DOMICILIO' && (
                  <a
                    href={`https://whatsapp.com{String(
                      RESTAURANT_WHATSAPP
                    ).replace(/\D/g, '')}&text=${encodeURIComponent(
                      `Hola Castillo's Pizza, confirmo mi pedido *#${orderSuccess.id}* a nombre de *${orderSuccess.customerName}* (${orderSuccess.tableOrAddress}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#1ebe5d]"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>Abrir WhatsApp para Confirmar</span>
                  </a>
                )}

                <Link
                  href={`/rastreo?orden=${orderSuccess.id}`}
                  onClick={() => {
                    setOrderSuccess(null);
                    onClose();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-extrabold text-[#FACC15] shadow-sm transition-colors hover:bg-gray-800"
                >
                  <Bike className="h-5 w-5" />
                  <span>Seguir mi Pedido en Vivo</span>
                </Link>


                <button
                  onClick={() => {
                    setOrderSuccess(null);
                    onClose();
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Seguir Viendo el Menú
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-full bg-amber-50 p-4 text-amber-500">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
              <p className="text-base font-bold text-gray-800">
                Aún no has agregado platos
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Explora nuestras pizzas, hamburguesas, carnes o bebidas.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen de Estaciones */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800">
                    <ChefHat className="h-4 w-4 text-amber-600" />
                    <span>Ticket Cocina</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    {foodItems.reduce((acc, i) => acc + i.quantity, 0)} platos
                  </p>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-800">
                    <Wine className="h-4 w-4 text-sky-600" />
                    <span>Ticket Barra</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-sky-700">
                    {drinkItems.reduce((acc, i) => acc + i.quantity, 0)} bebidas
                  </p>
                </div>
              </div>

              {/* Lista de Ítems en el Carrito */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={`${item.id}-${item.selectedOption}-${idx}`}
                    className="flex flex-col rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            item.station === 'BARRA'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.station}
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-gray-900">
                          {item.name}
                        </h4>
                        {item.selectedOption && (
                          <p className="text-xs font-semibold text-amber-700">
                            • {item.selectedOption}
                          </p>
                        )}
                        {item.notes && (
                          <p className="mt-0.5 text-xs italic text-gray-500">
                            Nota: &quot;{item.notes}&quot;
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-gray-900">
                        {formatPrice(item.finalPrice * item.quantity)}
                      </span>

                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
                        <button
                          onClick={() => onUpdateQuantity(idx, -1)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[20px] text-center text-xs font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(idx, 1)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Formulario de Mesa o Domicilio */}
              <form
                id="checkout-form"
                onSubmit={handleConfirmOrder}
                className="space-y-3 border-t border-gray-100 pt-4"
              >
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('MESA');
                      if (lockedTable) setTableOrAddress(lockedTable);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold transition-all ${
                      orderType === 'MESA'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                    <span>En Mesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('DOMICILIO');
                      if (lockedTable) setTableOrAddress('');
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold transition-all ${
                      orderType === 'DOMICILIO'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Bike className="h-3.5 w-3.5 text-amber-600" />
                    <span>Domicilio</span>
                  </button>
                </div>

                {/* Código de Mesero (Solo En Mesa) */}
                {orderType === 'MESA' && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-extrabold text-gray-800">
                        Código de Mesero (Si aplica)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={waiterCodeInput}
                        onChange={(e) => setWaiterCodeInput(e.target.value)}
                        placeholder="Ej: 101"
                        className="w-24 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-center text-xs font-extrabold text-gray-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {verifiedWaiter && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        <span>
                          Atiende: {verifiedWaiter.name} (#{verifiedWaiter.code})
                        </span>
                      </div>
                    )}

                    {waiterError && (
                      <p className="mt-1.5 text-[11px] font-bold text-red-600">
                        {waiterError}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>
                      {orderType === 'MESA'
                        ? 'Número de Mesa *'
                        : 'Dirección de Entrega *'}
                    </span>
                    {orderType === 'MESA' && lockedTable && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700">
                        <Lock className="h-3 w-3" />
                        Asignada por QR
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={orderType === 'MESA' && Boolean(lockedTable)}
                    value={tableOrAddress}
                    onChange={(e) => setTableOrAddress(e.target.value)}
                    placeholder={
                      orderType === 'MESA'
                        ? 'Ej: Mesa 4'
                        : 'Ej: Calle 35 # 18-20, Barrio Centro'
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none ${
                      orderType === 'MESA' && lockedTable
                        ? 'border-amber-300 bg-amber-50/70 font-extrabold text-amber-900 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-50 focus:border-amber-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Carlos Pérez"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Pie Fijo con Total y Botón Confirmar */}
        {!orderSuccess && items.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">
                Total a Pagar
              </span>
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={isSending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] py-3.5 text-sm font-extrabold text-gray-900 shadow-lg shadow-amber-400/25 transition-all hover:bg-amber-400 active:scale-98 disabled:opacity-60"
            >
              <Send className="h-4 w-4 stroke-[2.5]" />
              <span>
                {isSending
                  ? 'Enviando Comandas...'
                  : orderType === 'DOMICILIO'
                  ? 'Confirmar y Enviar a WhatsApp'
                  : 'Confirmar y Separar Comandas'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
