'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Users,
  PartyPopper,
  Play,
  MessageCircle,
  CheckCircle2,
  Camera,
  Crown,
  Clock,
  Layers,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const RESTAURANT_WHATSAPP = '573045959660';
const TIME_SLOTS = ['12:00 PM', '3:00 PM', '6:00 PM', '8:30 PM'];

const EVENT_FLOORS = [
  {
    id: 'Tercer Piso (Salón Principal VIP)',
    label: 'Tercer Piso • Salón Principal VIP',
    badge: 'MÁS USADO',
    maxTables: 16,
    description:
      'Salón panorámico exclusivo para celebraciones, grados y grupos grandes.',
  },
  {
    id: 'Segundo Piso (Salón Social & Familiar)',
    label: 'Segundo Piso • Salón Social & Familiar',
    badge: 'AMBIENTE FAMILIAR',
    maxTables: 12,
    description:
      'Espacio acogedor ideal para reuniones medianas, cenas y amigos.',
  },
];

interface EventPackage {
  id: string;
  title: string;
  category: string;
  base_price: number;
  price_per_table: number;
  description: string;
  highlights: string[];
}

interface ExistingBooking {
  id: string;
  floor_zone: string;
  event_date: string;
  event_time: string;
  tables_count: number;
}

export default function EventosPage() {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [bookings, setBookings] = useState<ExistingBooking[]>([]);

   const [viewDate, setViewDate] = useState<Date>(() => new Date(2026, 10, 1));
  const [selectedDate, setSelectedDate] = useState<string>(() => {
      useEffect(() => {
    const hoy = new Date();
    setViewDate(hoy);
    setSelectedDate(hoy.toISOString().slice(0, 10));
  }, []);

    const today = new Date('2026-11-22T12:00:00');
    return today.toISOString().slice(0, 10);
  });

  const [selectedFloor, setSelectedFloor] = useState<string>(
    'Tercer Piso (Salón Principal VIP)'
  );
  const [selectedTime, setSelectedTime] = useState<string>('6:00 PM');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [tablesCount, setTablesCount] = useState<number>(3);
  const [guestCount, setGuestCount] = useState<number>(12);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const loadData = async () => {
    if (!supabase) return;
    const [pkgRes, bookRes] = await Promise.all([
      supabase
        .from('event_packages')
        .select('*')
        .eq('active', true)
        .order('base_price', { ascending: true }),
      supabase
        .from('event_bookings')
        .select('id, floor_zone, event_date, event_time, tables_count'),
    ]);

    if (!pkgRes.error && pkgRes.data && pkgRes.data.length > 0) {
      const loaded = pkgRes.data as EventPackage[];
      setPackages(loaded);
      setSelectedPackageId((prev) => prev || loaded.at(0)?.id || '');
    }

    if (!bookRes.error && bookRes.data) {
      setBookings(bookRes.data as ExistingBooking[]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const currentFloorObj =
    EVENT_FLOORS.find((f) => f.id === selectedFloor) || EVENT_FLOORS.at(0)!;

  const activePackage =
    packages.find((p) => p.id === selectedPackageId) || packages.at(0) || null;

  const estimatedTotal = activePackage
    ? Number(activePackage.base_price) +
      Number(activePackage.price_per_table) * tablesCount
    : 0;

  const occupiedSlotsForSelection = bookings
    .filter(
      (b) => b.event_date === selectedDate && b.floor_zone === selectedFloor
    )
    .map((b) => b.event_time);

  useEffect(() => {
    if (occupiedSlotsForSelection.includes(selectedTime)) {
      const firstFree = TIME_SLOTS.find(
        (slot) => !occupiedSlotsForSelection.includes(slot)
      );
      if (firstFree) setSelectedTime(firstFree);
    }
  }, [selectedDate, selectedFloor, bookings]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const handleConfirmEventBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !selectedDate || !activePackage) return;
    if (occupiedSlotsForSelection.includes(selectedTime)) {
      alert('Ese horario ya está ocupado en este piso. Por favor elige otro.');
      return;
    }

    setIsBooking(true);

    try {
      if (supabase) {
        await supabase.from('event_bookings').insert([
          {
            client_name: clientName.trim(),
            client_phone: clientPhone.trim() || null,
            floor_zone: selectedFloor,
            event_date: selectedDate,
            event_time: selectedTime,
            tables_count: tablesCount,
            guest_count: guestCount,
            package_title: activePackage.title,
            estimated_total: estimatedTotal,
            notes: notes.trim() || null,
            status: 'RESERVADO',
          },
        ]);
        await loadData();
      }

      const text = [
        `👑 *COTIZACIÓN Y RESERVA VIP - CASTILLO'S PIZZA*`,
        `*Cliente:* ${clientName.trim()}`,
        clientPhone.trim() ? `*Teléfono:* ${clientPhone.trim()}` : '',
        `*Piso Seleccionado:* ${selectedFloor}`,
        `*Fecha y Hora:* ${selectedDate} a las ${selectedTime}`,
        `*Paquete Elegido:* ${activePackage.title}`,
        `*Mesas Solicitadas:* ${tablesCount} mesas (~${guestCount} personas)`,
        `*Cotización Estimada:* ${formatPrice(estimatedTotal)}`,
        notes.trim() ? `*Notas:* ${notes.trim()}` : '',
        ``,
        `Hola, acabo de agendar esta fecha en el calendario web de Castillo's Pizza y deseo confirmarla.`,
      ]
        .filter(Boolean)
        .join('\n');

      const encodedMessage = encodeURIComponent(text);
      const urlWeb = `https://wa.me{RESTAURANT_WHATSAPP}?text=${encodedMessage}`;
      const urlApp = `whatsapp://send?phone=${RESTAURANT_WHATSAPP}&text=${encodedMessage}`;
      const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      setBookingConfirmed(true);

      if (esMovil) {
        window.location.href = urlApp;
        setTimeout(() => {
          if (!document.hidden) window.location.href = urlWeb;
        }, 1500);
      } else {
        window.open(urlWeb, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  const nowObj = new Date('2026-11-22T12:00:00');
  const todayIso = `${nowObj.getFullYear()}-${String(
    nowObj.getMonth() + 1
  ).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-amber-400 selection:text-black">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[750px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-yellow-400/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090A0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-white/5 px-4 py-2 text-xs font-extrabold text-amber-200 transition-all hover:border-amber-400 hover:bg-amber-400/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-amber-400" />
            <span>Volver al Menú</span>
          </Link>

          <div className="relative h-11 w-28 rounded-xl bg-white/95 p-1.5 shadow-[0_0_25px_rgba(250,204,21,0.3)]">
            <Image
              src="/logo-castillos.png"
              alt="Castillo's Pizza"
              fill
              className="object-contain"
            />
          </div>

          <a
            href="#cotizador-vip"
            className="rounded-full bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] px-4 py-2 text-xs font-extrabold text-gray-950 shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-transform hover:scale-105"
          >
            Agendar Fecha
          </a>
        </div>
      </header>

      <section className="relative border-b border-amber-500/15 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
            <Crown className="h-4 w-4 text-amber-400" />
            <span>SALONES VIP 2DO Y 3ER PISO • CASTILLO&apos;S PIZZA</span>
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Eventos Mágicos &amp; Cotizador VIP
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Verifica en tiempo real la disponibilidad de nuestro{' '}
            <strong className="text-amber-300">Tercer Piso Principal VIP</strong>{' '}
            y <strong className="text-amber-300">Segundo Piso Social</strong>,
            calcula tu paquete al instante y aparta tu horario.
          </p>
        </div>
      </section>

      <main
        id="cotizador-vip"
        className="relative mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8"
      >
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
              <PartyPopper className="h-6 w-6 text-amber-400" />
              <span>Nuestros Salones &amp; Experiencias</span>
            </h2>
            <span className="text-xs font-bold text-amber-300/80">
              2do y 3er Piso equipados para tu celebración
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {packages.map((pkg, idx) => (
              <article
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`cursor-pointer rounded-3xl border p-6 transition-all duration-300 ${
                  selectedPackageId === pkg.id
                    ? 'border-amber-400 bg-gradient-to-b from-amber-400/15 to-[#0D0E14] shadow-[0_0_35px_rgba(250,204,21,0.22)]'
                    : 'border-amber-500/20 bg-[#0E0F15] hover:border-amber-400/50'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    {pkg.category}
                  </span>
                  {idx % 2 === 0 ? (
                    <Play className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Camera className="h-4 w-4 text-amber-400" />
                  )}
                </div>

                <h3 className="text-lg font-extrabold text-white">{pkg.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {pkg.description}
                </p>

                <div className="mt-4 border-t border-white/10 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Base Paquete:</span>
                    <span className="text-sm font-extrabold text-amber-300">
                      {formatPrice(Number(pkg.base_price))}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-zinc-400">Por Mesa:</span>
                    <span className="font-bold text-emerald-400">
                      +{formatPrice(Number(pkg.price_per_table))}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#12131A] to-[#0A0B0F] p-6 shadow-2xl lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                  <CalendarIcon className="h-5 w-5 text-amber-400" />
                  <span>1. Calendario de Disponibilidad</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Selecciona el día y verifica horarios libres en 2do y 3er Piso
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-black/50 px-3 py-1">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  className="p-1 text-amber-300 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[130px] text-center text-xs font-extrabold capitalize text-amber-200">
                  {monthName}
                </span>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  className="p-1 text-amber-300 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-extrabold uppercase text-zinc-500">
                <span>Dom</span>
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-11" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                    dayNum
                  ).padStart(2, '0')}`;
                  const isPast = iso < todayIso;
                  const isSelected = iso === selectedDate;
                  const dayBookingsCount = bookings.filter(
                    (b) => b.event_date === iso
                  ).length;

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(iso)}
                      className={`relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition-all ${
                        isPast
                          ? 'cursor-not-allowed border-transparent bg-white/2 text-zinc-700'
                          : isSelected
                          ? 'border-amber-300 bg-gradient-to-br from-[#FDE047] to-[#D97706] text-gray-950 shadow-[0_0_18px_rgba(250,204,21,0.45)]'
                          : dayBookingsCount >= 6
                          ? 'border-red-500/40 bg-red-950/30 text-red-300'
                          : dayBookingsCount > 0
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400'
                          : 'border-white/10 bg-white/5 text-zinc-200 hover:border-amber-400/60 hover:bg-amber-400/10'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {!isPast && dayBookingsCount > 0 && !isSelected && (
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" /> Libre
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Con reservas parciales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Alta ocupación
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <label className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                <Layers className="h-4 w-4" />
                <span>2. Elige el Piso para tu Evento</span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EVENT_FLOORS.map((floor) => {
                  const active = selectedFloor === floor.id;
                  return (
                    <button
                      key={floor.id}
                      type="button"
                      onClick={() => {
                        setSelectedFloor(floor.id);
                        if (tablesCount > floor.maxTables) {
                          setTablesCount(floor.maxTables);
                        }
                      }}
                      className={`rounded-2xl border p-3.5 text-left transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-400/15 shadow-[0_0_20px_rgba(250,204,21,0.18)]'
                          : 'border-white/10 bg-black/40 hover:border-amber-500/40'
                      }`}
                    >
                      <span className="inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                        {floor.badge}
                      </span>
                      <p className="mt-1.5 text-xs font-extrabold text-white">
                        {floor.label}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {floor.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <label className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                <Clock className="h-4 w-4" />
                <span>3. Horarios Disponibles ({selectedDate})</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {TIME_SLOTS.map((slot) => {
                  const isBusy = occupiedSlotsForSelection.includes(slot);
                  const isChosen = selectedTime === slot && !isBusy;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBusy}
                      onClick={() => setSelectedTime(slot)}
                      className={`rounded-xl border py-2.5 text-xs font-extrabold transition-all ${
                        isBusy
                          ? 'cursor-not-allowed border-red-500/30 bg-red-950/30 text-red-400 line-through'
                          : isChosen
                          ? 'border-amber-300 bg-gradient-to-r from-[#FACC15] to-[#D97706] text-gray-950 shadow-md'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-amber-400'
                      }`}
                    >
                      {isBusy ? `${slot} (Ocupado)` : `${slot} • Libre`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <form
            onSubmit={handleConfirmEventBooking}
            className="flex flex-col justify-between rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#151620] to-[#0A0B0F] p-6 shadow-[0_0_45px_rgba(250,204,21,0.12)] lg:col-span-5"
          >
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-amber-300">
                  <Calculator className="h-5 w-5" />
                  <span>4. Cotizador Inteligente VIP</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Personaliza mesas y paquete para calcular tu inversión al instante
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-200">
                  Paquete del Evento
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full rounded-xl border border-amber-500/30 bg-black/80 px-3.5 py-2.5 text-xs font-extrabold text-white focus:border-amber-400 focus:outline-none"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.title} (Base {formatPrice(Number(pkg.base_price))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200">
                    Mesas a Reservar (Máx {currentFloorObj.maxTables})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={currentFloorObj.maxTables}
                    value={tablesCount}
                    onChange={(e) => {
                      const val = Math.max(
                        1,
                        Math.min(currentFloorObj.maxTables, Number(e.target.value))
                      );
                      setTablesCount(val);
                      setGuestCount(val * 4);
                    }}
                    className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3.5 py-2.5 text-sm font-extrabold text-amber-300 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200">
                    Personas Estimadas
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm font-extrabold text-zinc-200">
                    <Users className="h-4 w-4 text-amber-400" />
                    <input
                      type="number"
                      min={2}
                      max={100}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-amber-200">
                    Tu Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Laura Martínez"
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-amber-200">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ej: 300 123 4567"
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-amber-200">
                  Detalles (Decoración, torta, platos favoritos)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent p-4">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>Piso y Horario:</span>
                  <span className="font-extrabold text-amber-200">
                    {currentFloorObj.label.split(' • ').at(0)} • {selectedTime}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-300">
                  <span>Paquete + {tablesCount} mesa(s):</span>
                  <span className="font-bold text-zinc-200">
                    {activePackage
                      ? `${formatPrice(Number(activePackage.base_price))} + ${formatPrice(
                          Number(activePackage.price_per_table) * tablesCount
                        )}`
                      : '$0'}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-amber-400/30 pt-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    Cotización Estimada
                  </span>
                  <span className="bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-2xl font-extrabold text-transparent">
                    {formatPrice(estimatedTotal)}
                  </span>
                </div>
              </div>

              {bookingConfirmed && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-3 text-xs font-extrabold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    ¡Fecha reservada en el calendario! Abriendo WhatsApp para confirmar.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isBooking || occupiedSlotsForSelection.includes(selectedTime)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] py-4 text-xs font-extrabold uppercase tracking-wider text-gray-950 shadow-[0_0_25px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.01] disabled:opacity-40"
            >
              <MessageCircle className="h-4 w-4 stroke-[2.5]" />
              <span>
                {isBooking
                  ? 'Agendando en Calendario...'
                  : 'Agendar Fecha y Enviar a WhatsApp'}
              </span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
