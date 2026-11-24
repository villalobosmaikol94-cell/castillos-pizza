'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CartItem,
  MenuCategory,
  Product,
  RestaurantSpot,
} from '@/types/restaurant';
import { MENU_CATEGORIES, MENU_PRODUCTS } from '@/data/menuData';
import {
  Armchair,
  CheckCircle2,
  ChefHat,
  Lock,
  Layers,
  Plus,
  Printer,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  Wine,
  X,
} from 'lucide-react';

interface SpotsMapProps {
  onSelectSpotForOrder?: (spotLabel: string) => void;
}

interface ActiveTableOrder {
  id: string;
  customer_name: string;
  table_or_address: string;
  items: CartItem[];
  total: number;
  status: string;
  waiter_name?: string;
  created_at?: string;
}

interface PrintedTicketData {
  orderId: string;
  spotLabel: string;
  waiterName: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  isAddition: boolean;
}

type FloorTab = 'PISO_1' | 'PISO_2' | 'PISO_3';

const BAR_CHAIRS_NUMBERS = Array.from({ length: 7 }, (_, i) => i + 1);


export default function SpotsMap({ onSelectSpotForOrder }: SpotsMapProps) {
  const [spots, setSpots] = useState<RestaurantSpot[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveTableOrder[]>([]);
  const [menuCatalog, setMenuCatalog] = useState<Product[]>(MENU_PRODUCTS);
  const [loading, setLoading] = useState(true);

  const [activeFloor, setActiveFloor] = useState<FloorTab>('PISO_1');
  const [selectedSpotLabel, setSelectedSpotLabel] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | 'Todas'
  >('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  const [waiterCodeInput, setWaiterCodeInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [waiterError, setWaiterError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastComanda, setLastComanda] = useState<PrintedTicketData | null>(null);
  const loadSpotsAndOrders = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [spotsRes, ordersRes, menuRes] = await Promise.all([
      supabase
        .from('restaurant_spots')
        .select('*')
        .order('spot_number', { ascending: true }),
      supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'MESA')
        .eq('is_cancelled', false)
        .neq('status', 'COBRADO')
        .order('created_at', { ascending: false }),
      supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true }),
    ]);

    if (!spotsRes.error && spotsRes.data) {
      setSpots(spotsRes.data as RestaurantSpot[]);
    }
    if (!ordersRes.error && ordersRes.data) {
      setActiveOrders(ordersRes.data as ActiveTableOrder[]);
    }
    if (!menuRes.error && menuRes.data && menuRes.data.length > 0) {
      const mapped = menuRes.data
        .filter((row: Record<string, unknown>) => row.available !== false)
        .map((row: Record<string, unknown>) => ({
          id: String(row.id),
          name: String(row.name),
          description: String(row.description || ''),
          price: Number(row.price || row.base_price || 0),
          category: row.category as MenuCategory,
          station: (row.station as 'COCINA' | 'BARRA') || 'COCINA',
          popular: Boolean(row.popular),
          available: row.available !== false,
          imageUrl: row.image_url ? String(row.image_url) : undefined,
        }));
      if (mapped.length > 0) setMenuCatalog(mapped);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSpotsAndOrders();

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('realtime-spots-and-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_spots' },
        () => loadSpotsAndOrders()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadSpotsAndOrders()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  const getTableFloor = (spotNumber: number): FloorTab => {
    if (spotNumber <= 12) return 'PISO_1';
    if (spotNumber <= 24) return 'PISO_2';
    return 'PISO_3';
  };

  const getActiveOrderForSpot = (spotLabel: string) =>
    activeOrders.find(
      (o) =>
        o.table_or_address.trim().toLowerCase() ===
        spotLabel.trim().toLowerCase()
    );

  const openSpotDrawer = (spotLabel: string) => {
    setSelectedSpotLabel(spotLabel);
    setDraftItems([]);
    setWaiterError('');
    setLastComanda(null);
    setSearchQuery('');
    setSelectedCategory('Todas');
    if (onSelectSpotForOrder) {
      onSelectSpotForOrder(spotLabel);
    }
  };
  const handleAddDraftProduct = (product: Product) => {
    setDraftItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...product,
          quantity: 1,
          finalPrice: product.price,
        },
      ];
    });
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSendOrderOrAddition = async () => {
    if (!selectedSpotLabel || draftItems.length === 0) return;

    const cleanCode = waiterCodeInput.trim();
    if (!cleanCode) {
      setWaiterError('Ingresa tu clave personal de mesero.');
      return;
    }

    setIsSubmitting(true);
    setWaiterError('');

    try {
      let waiterDisplayName = 'Mesero Autorizado';

      if (supabase) {
        const { data: waiterData, error: waiterErr } = await supabase
          .from('waiters')
          .select('name')
          .eq('code', cleanCode)
          .eq('active', true)
          .single();

        if (waiterErr || !waiterData) {
          setWaiterError('Clave de mesero no válida o inactiva.');
          setIsSubmitting(false);
          return;
        }
        waiterDisplayName = String(waiterData.name);
      }

      const existingOrder = getActiveOrderForSpot(selectedSpotLabel);
      const addedSubtotal = draftItems.reduce(
        (sum, item) => sum + item.finalPrice * item.quantity,
        0
      );

      let finalOrderId = existingOrder?.id || '';

      if (existingOrder) {
        const mergedItems = [...existingOrder.items, ...draftItems];
        const newTotal = Number(existingOrder.total || 0) + addedSubtotal;

        if (supabase) {
          const { error: updErr } = await supabase
            .from('orders')
            .update({
              items: mergedItems,
              total: newTotal,
              kitchen_status: 'EN_COLA',
              status: 'PENDIENTE',
            })
            .eq('id', existingOrder.id);

          if (updErr) {
            alert(`Error al actualizar pedido: ${updErr.message}`);
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        const generatedCode = `CP-${Math.floor(1000 + Math.random() * 9000)}`;
        finalOrderId = generatedCode;

        const newOrderPayload = {
          id: generatedCode,
          customer_name:
            customerNameInput.trim() || `Cliente ${selectedSpotLabel}`,
          order_type: 'MESA',
          table_or_address: selectedSpotLabel,
          items: draftItems,
          total: addedSubtotal,
          status: 'PENDIENTE',
          kitchen_status: 'EN_COLA',
          waiter_name: waiterDisplayName,
          waiter_code: cleanCode,
          is_cancelled: false,
        };

        if (supabase) {
          const { data: insertedRow, error: insErr } = await supabase
            .from('orders')
            .insert([newOrderPayload])
            .select()
            .single();

          if (insErr) {
            alert(`No se pudo enviar la comanda: ${insErr.message}`);
            setIsSubmitting(false);
            return;
          }
          if (insertedRow && insertedRow.id) {
            finalOrderId = String(insertedRow.id);
          }

          const spotObj = spots.find(
            (s) =>
              (s.spot_type === 'BARRA'
                ? `Barra ${s.spot_number}`
                : `Mesa ${s.spot_number}`
              ).toLowerCase() === selectedSpotLabel.toLowerCase()
          );

          if (spotObj) {
            await supabase
              .from('restaurant_spots')
              .update({
                status: 'OCUPADA',
                updated_at: new Date().toISOString(),
              })
              .eq('id', spotObj.id);
          }
        }
      }

      setLastComanda({
        orderId: finalOrderId,
        spotLabel: selectedSpotLabel,
        waiterName: waiterDisplayName,
        items: [...draftItems],
        total: addedSubtotal,
        createdAt: new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isAddition: Boolean(existingOrder),
      });

      setDraftItems([]);
      setCustomerNameInput('');
      setWaiterCodeInput('');
      await loadSpotsAndOrders();
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReleaseTableAdmin = async (spotLabel: string) => {
    const pin = prompt(
      '🔒 Acceso restringido a Cajera / Administrador. Ingresa clave de autorización:'
    );
    if (pin !== '1989' && pin !== '2026') {
      alert('Clave incorrecta. Los meseros no pueden liberar ni eliminar mesas atendidas.');
      return;
    }

    const existingOrder = getActiveOrderForSpot(spotLabel);
    if (supabase) {
      if (existingOrder) {
        await supabase
          .from('orders')
          .update({ status: 'COBRADO' })
          .eq('id', existingOrder.id);
      }

      const spotObj = spots.find(
        (s) =>
          (s.spot_type === 'BARRA'
            ? `Barra ${s.spot_number}`
            : `Mesa ${s.spot_number}`
          ).toLowerCase() === spotLabel.toLowerCase()
      );
      if (spotObj) {
        await supabase
          .from('restaurant_spots')
          .update({ status: 'DISPONIBLE', updated_at: new Date().toISOString() })
          .eq('id', spotObj.id);
      }
    }

    setSelectedSpotLabel(null);
    await loadSpotsAndOrders();
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const tables = spots.filter((s) => s.spot_type === 'MESA');
  const currentFloorTables = tables.filter(
    (t) => getTableFloor(t.spot_number) === activeFloor
  );
  const selectedSpotOrder = selectedSpotLabel
    ? getActiveOrderForSpot(selectedSpotLabel)
    : undefined;

  const filteredProducts = menuCatalog.filter((p) => {
    const matchesCat =
      selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const floorShortTag =
    activeFloor === 'PISO_1' ? 'P1' : activeFloor === 'PISO_2' ? 'P2' : 'P3';

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-400">
        Cargando mapa de 3 pisos, mesas y barras...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Layers className="h-5 w-5 text-amber-500" />
            <span>Salones por Pisos y Barras (3 Pisos)</span>
          </h2>
          <p className="text-xs text-gray-500">
            Cada piso cuenta con sus 12 mesas y 7 sillas de barra independientes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5">
          <button
            type="button"
            onClick={() => setActiveFloor('PISO_1')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeFloor === 'PISO_1'
                ? 'bg-gray-900 text-[#FACC15] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            1er Piso (M1-12 + Barra)
          </button>
          <button
            type="button"
            onClick={() => setActiveFloor('PISO_2')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeFloor === 'PISO_2'
                ? 'bg-gray-900 text-[#FACC15] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            2do Piso (M13-24 + Barra)
          </button>
          <button
            type="button"
            onClick={() => setActiveFloor('PISO_3')}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeFloor === 'PISO_3'
                ? 'bg-gray-900 text-[#FACC15] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            3er Piso VIP (M25-36 + Barra)
          </button>
        </div>
      </div>

      {/* Zona de Barra: 7 Sillas en TODOS los 3 pisos */}
      <section className="rounded-3xl border border-sky-200/80 bg-sky-50/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-sky-700" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-sky-900">
              Zona de Barra •{' '}
              {activeFloor === 'PISO_1'
                ? 'Primer Piso'
                : activeFloor === 'PISO_2'
                ? 'Segundo Piso'
                : 'Tercer Piso VIP'}{' '}
              (7 Sillas)
            </h3>
          </div>
          <span className="text-xs font-bold text-sky-700">
            Toca una silla para ver menú, pedir o añadir
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {BAR_CHAIRS_NUMBERS.map((num) => {
            const label =
              activeFloor === 'PISO_1'
                ? `Barra ${num}`
                : `Barra ${floorShortTag}-${num}`;
            const activeOrder = getActiveOrderForSpot(label);
            const isLocked = Boolean(activeOrder);

            return (
              <button
                key={label}
                type="button"
                onClick={() => openSpotDrawer(label)}
                className={`flex flex-col items-center rounded-2xl border-2 p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5 active:scale-95 ${
                  isLocked
                    ? 'border-red-300 bg-red-50/90 text-red-950'
                    : 'border-emerald-200 bg-white text-gray-900 hover:border-emerald-400'
                }`}
              >
                <div
                  className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                    isLocked
                      ? 'bg-red-600 text-white'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Armchair className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-extrabold">{label}</span>
                <span
                  className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    isLocked
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isLocked ? 'Atendida' : 'Disponible'}
                </span>
                {activeOrder && (
                  <span className="mt-1 text-[11px] font-extrabold text-red-700">
                    {formatPrice(activeOrder.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {/* Zona de Mesas: 12 Mesas por Piso */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-800">
            {activeFloor === 'PISO_1'
              ? 'Mesas Primer Piso (Mesas 1 a 12)'
              : activeFloor === 'PISO_2'
              ? 'Mesas Segundo Piso (Mesas 13 a 24)'
              : 'Mesas Tercer Piso VIP (Mesas 25 a 36)'}
          </h3>

          <div className="flex items-center gap-3 text-xs font-extrabold">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Libres
            </span>
            <span className="inline-flex items-center gap-1 text-red-700">
              <Lock className="h-3.5 w-3.5" /> Atendidas / Bloqueadas
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {currentFloorTables.map((table) => {
            const label = `Mesa ${table.spot_number}`;
            const activeOrder = getActiveOrderForSpot(label);
            const isLocked =
              Boolean(activeOrder) || table.status === 'OCUPADA';

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => openSpotDrawer(label)}
                className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center shadow-2xs transition-all hover:-translate-y-0.5 active:scale-95 ${
                  isLocked
                    ? 'border-red-300 bg-red-50/90 text-red-950'
                    : 'border-emerald-200 bg-white text-gray-900 hover:border-emerald-400'
                }`}
              >
                <div
                  className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border-2 font-extrabold text-base ${
                    isLocked
                      ? 'border-red-300 bg-red-600 text-white'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    `M${table.spot_number}`
                  )}
                </div>

                <span className="text-sm font-extrabold">{label}</span>

                <span
                  className={`mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    isLocked
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isLocked ? 'Bloqueada • Pedido' : 'Disponible'}
                </span>

                {activeOrder ? (
                  <div className="mt-2 w-full rounded-xl bg-white/80 px-2 py-1 text-[11px]">
                    <span className="block font-extrabold text-red-700">
                      {formatPrice(activeOrder.total)}
                    </span>
                    <span className="block truncate text-[10px] font-semibold text-gray-500">
                      {activeOrder.items.length} ítems • + Adicional
                    </span>
                  </div>
                ) : (
                  <span className="mt-2.5 block w-full rounded-lg bg-[#FACC15] py-1 text-[11px] font-extrabold text-gray-900">
                    Ver Carta / Pedir
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedSpotLabel && (
        <div
          onClick={() => setSelectedSpotLabel(null)}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-4xl flex-col bg-[#FAFAFA] shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-extrabold text-[#FACC15]">
                    {selectedSpotLabel}
                  </span>
                  {selectedSpotOrder ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-700">
                      <Lock className="h-3 w-3" /> Mesa Atendida • Solo Agregar Adicionales
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Disponible • Carta Completa
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Explora todos los productos del restaurante para armar la comanda o añadir postres/bebidas
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedSpotOrder && (
                  <button
                    type="button"
                    onClick={() => handleReleaseTableAdmin(selectedSpotLabel)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 hover:bg-red-600 hover:text-white"
                    title="Solo Cajera o Administrador"
                  >
                    Liberar / Cobrar Mesa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSpotLabel(null)}
                  className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
              <div className="flex flex-col overflow-y-auto border-b border-gray-200 p-5 lg:col-span-7 lg:border-r lg:border-b-0">
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar plato, postre, bebida o adicional..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-900 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Todas')}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${
                      selectedCategory === 'Todas'
                        ? 'bg-gray-900 text-[#FACC15]'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    Todo ({menuCatalog.length})
                  </button>
                  {MENU_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        selectedCategory === cat
                          ? 'bg-gray-900 text-[#FACC15]'
                          : 'bg-white text-gray-600 border border-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs"
                    >
                      <div>
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="mb-2.5 h-28 w-full rounded-xl object-cover"
                          />
                        )}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase text-amber-700">
                            {product.category}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {product.station}
                          </span>
                        </div>
                        <h4 className="mt-1 text-xs font-extrabold text-gray-900">
                          {product.name}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
                          {product.description}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
                        <span className="text-xs font-extrabold text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddDraftProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FACC15] px-2.5 py-1.5 text-[11px] font-extrabold text-gray-900 hover:bg-amber-400"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Añadir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between overflow-y-auto bg-white p-5 lg:col-span-5">
                <div className="space-y-4">
                  {lastComanda && (
                    <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <div>
                          <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {lastComanda.isAddition
                              ? 'ADICIONAL ENVIADO'
                              : 'COMANDA ENVIADA'}
                          </span>
                          <h4 className="mt-1 text-sm font-extrabold text-gray-900">
                            {lastComanda.spotLabel} • #{lastComanda.orderId}
                          </h4>
                          <p className="text-[11px] font-semibold text-gray-600">
                            Mesero: {lastComanda.waiterName} •{' '}
                            {lastComanda.createdAt}
                          </p>
                        </div>

                                                <button
                          type="button"
                          onClick={() => {
                            const cocinaItems = lastComanda.items.filter(
                              (i) => i.station === 'COCINA'
                            );
                            const barraItems = lastComanda.items.filter(
                              (i) => i.station === 'BARRA'
                            );
                            const buildTicketSection = (
                              title: string,
                              list: typeof lastComanda.items
                            ) =>
                              list.length === 0
                                ? ''
                                : `<div style="border-top:1px dashed #000;margin-top:8px;padding-top:6px;">
                                    <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">*** ${title} ***</div>
                                    ${list
                                      .map(
                                        (it) =>
                                          `<div style="font-size:13px;font-weight:bold;margin:3px 0;">${it.quantity}x ${it.name}</div>`
                                      )
                                      .join('')}
                                  </div>`;

                            const win = window.open(
                              '',
                              '_blank',
                              'width=320,height=600'
                            );
                            if (!win) return;
                            win.document.write(`
                              <html>
                                <head>
                                  <title>Comanda ${lastComanda.spotLabel}</title>
                                  <style>
                                    @page { margin: 0; }
                                    body {
                                      font-family: 'Courier New', monospace;
                                      width: 72mm;
                                      margin: 0 auto;
                                      padding: 8px;
                                      color: #000;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div style="text-align:center;">
                                    <div style="font-size:16px;font-weight:bold;">CASTILLO'S PIZZA</div>
                                    <div style="font-size:11px;">NIT: 1099365552-1</div>
                                    <div style="font-size:11px;">Bucaramanga, Santander</div>
                                    <div style="margin-top:6px;font-size:14px;font-weight:bold;border:1px solid #000;padding:3px;">
                                      ${lastComanda.isAddition ? 'ADICIONAL' : 'COMANDA'} • ${lastComanda.spotLabel}
                                    </div>
                                  </div>
                                  <div style="font-size:11px;margin-top:8px;">
                                    <div>Orden: <strong>#${lastComanda.orderId}</strong></div>
                                    <div>Mesero: <strong>${lastComanda.waiterName}</strong></div>
                                    <div>Hora: ${lastComanda.createdAt}</div>
                                  </div>
                                  ${buildTicketSection('COMANDA COCINA', cocinaItems)}
                                  ${buildTicketSection('COMANDA BARRA', barraItems)}
                                  <div style="border-top:1px dashed #000;margin-top:12px;padding-top:6px;text-align:center;font-size:11px;">
                                    --- FIN DE COMANDA ---
                                  </div>
                                  <script>
                                    window.onload = function() {
                                      window.print();
                                      setTimeout(function() { window.close(); }, 400);
                                    };
                                  </script>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-extrabold text-[#FACC15] shadow-xs hover:bg-gray-800"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Imprimir Ticket</span>
                        </button>

                      </div>

                      {lastComanda.items.filter((i) => i.station === 'COCINA')
                        .length > 0 && (
                        <div className="mt-2.5 rounded-xl border border-amber-200 bg-white p-2.5 text-xs">
                          <p className="mb-1 flex items-center gap-1 font-extrabold text-amber-800">
                            <ChefHat className="h-3.5 w-3.5" />
                            <span>COMANDA COCINA</span>
                          </p>
                          <ul className="space-y-1">
                            {lastComanda.items
                              .filter((i) => i.station === 'COCINA')
                              .map((it, k) => (
                                <li key={k} className="font-bold text-gray-900">
                                  {it.quantity}x {it.name}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {lastComanda.items.filter((i) => i.station === 'BARRA')
                        .length > 0 && (
                        <div className="mt-2 rounded-xl border border-sky-200 bg-white p-2.5 text-xs">
                          <p className="mb-1 flex items-center gap-1 font-extrabold text-sky-800">
                            <Wine className="h-3.5 w-3.5" />
                            <span>COMANDA BARRA</span>
                          </p>
                          <ul className="space-y-1">
                            {lastComanda.items
                              .filter((i) => i.station === 'BARRA')
                              .map((it, k) => (
                                <li key={k} className="font-bold text-gray-900">
                                  {it.quantity}x {it.name}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSpotOrder && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-extrabold text-red-900">
                          <Lock className="h-3.5 w-3.5 text-red-600" />
                          <span>Pedido Ya Enviado (Bloqueado)</span>
                        </span>
                        <span className="text-[11px] font-bold text-red-700">
                          #{selectedSpotOrder.id}
                        </span>
                      </div>
                      <p className="mb-2 text-[11px] text-red-800">
                        Atendió:{' '}
                        <strong>
                          {selectedSpotOrder.waiter_name || 'Mesa QR'}
                        </strong>{' '}
                        • Los ítems enviados no pueden eliminarse por meseros.
                      </p>

                      <ul className="space-y-1.5 border-t border-red-200/70 pt-2 text-xs">
                        {selectedSpotOrder.items.map((item, i) => (
                          <li
                            key={`${item.name}-${i}`}
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

                      <div className="mt-2.5 flex items-center justify-between border-t border-red-200 pt-2 text-xs font-extrabold text-red-950">
                        <span>Subtotal Actual en Mesa:</span>
                        <span>{formatPrice(selectedSpotOrder.total)}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-800">
                      <ShoppingBag className="h-4 w-4 text-amber-500" />
                      <span>
                        {selectedSpotOrder
                          ? 'Nuevos Adicionales / Postres a Sumar'
                          : 'Nuevo Pedido para ' + selectedSpotLabel}
                      </span>
                    </h4>

                    {draftItems.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        Selecciona productos de la izquierda para{' '}
                        {selectedSpotOrder
                          ? 'agregarlos a la cuenta de esta mesa.'
                          : 'iniciar el pedido.'}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {draftItems.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs"
                          >
                            <div>
                              <p className="font-extrabold text-gray-900">
                                {item.quantity}x {item.name}
                              </p>
                              <p className="text-[11px] font-bold text-amber-800">
                                {formatPrice(item.finalPrice * item.quantity)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(idx)}
                              className="rounded-lg bg-white p-1.5 text-red-600 hover:bg-red-50"
                              title="Quitar antes de enviar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {draftItems.length > 0 && (
                  <div className="mt-5 space-y-3 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={waiterCodeInput}
                        onChange={(e) => setWaiterCodeInput(e.target.value)}
                        placeholder="Clave privada mesero"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-extrabold text-gray-900"
                      />
                      <input
                        type="text"
                        value={customerNameInput}
                        onChange={(e) => setCustomerNameInput(e.target.value)}
                        placeholder="Nombre cliente (opcional)"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                      />
                    </div>

                    {waiterError && (
                      <p className="text-xs font-bold text-red-600">
                        {waiterError}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs font-extrabold text-gray-900">
                      <span>
                        {selectedSpotOrder
                          ? 'Total Nuevo (Pedido + Adicionales):'
                          : 'Total Pedido:'}
                      </span>
                      <span className="text-base text-emerald-700">
                        {formatPrice(
                          (selectedSpotOrder?.total || 0) +
                            draftItems.reduce(
                              (sum, i) => sum + i.finalPrice * i.quantity,
                              0
                            )
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSendOrderOrAddition}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-xs font-extrabold uppercase tracking-wider text-[#FACC15] shadow-md hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {isSubmitting
                          ? 'Enviando Comanda...'
                          : selectedSpotOrder
                          ? 'Agregar Adicionales y Generar Comanda'
                          : 'Confirmar Pedido y Generar Comanda'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
