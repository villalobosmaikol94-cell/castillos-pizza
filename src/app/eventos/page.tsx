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
  Sparkles,
  X,
} from 'lucide-react';

const RESTAURANT_WHATSAPP = '573045959660';
const TIME_SLOTS = ['12:00 PM', '3:00 PM', '6:00 PM', '8:30 PM'];

const EVENT_FLOORS = [
  {
    id: 'Tercer Piso (Salón Principal VIP)',
    label: 'Tercer Piso • Salón VIP',
    badge: 'MÁS USADO',
    maxTables: 16,
    description:
      'Salón panorámico exclusivo para cumpleaños, grados y grupos grandes.',
  },
  {
    id: 'Segundo Piso (Salón Social & Familiar)',
    label: 'Segundo Piso • Social',
    badge: 'FAMILIAR',
    maxTables: 12,
    description:
      'Ambiente acogedor para reuniones medianas, cenas y amigos.',
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

interface EventMediaItem {
  id: string;
  title: string;
  media_type: 'PHOTO' | 'VIDEO';
  media_url: string;
  floor_tag: string;
}

const DEFAULT_MEDIA: EventMediaItem[] = [
  {
    id: 'demo-1',
    title: 'Noche de Celebración VIP • Tercer Piso',
    media_type: 'PHOTO',
    media_url: '/hero-castillos.jpg',
    floor_tag: 'Tercer Piso VIP',
  },
  {
    id: 'demo-2',
    title: 'Mesa Imperial y Pizzas Artesanales • Segundo Piso',
    media_type: 'PHOTO',
    media_url: '/hero-castillos.jpg',
    floor_tag: 'Segundo Piso Social',
  },
];

export default function EventosPage() {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [bookings, setBookings] = useState<ExistingBooking[]>([]);
  const [mediaItems, setMediaItems] = useState<EventMediaItem[]>(DEFAULT_MEDIA);
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'VIDEO' | 'PHOTO'>(
    'ALL'
  );
  const [lightboxItem, setLightboxItem] = useState<EventMediaItem | null>(null);

  const [viewDate, setViewDate] = useState<Date>(() => new Date(2026, 10, 1));
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-22');
  const [todayIso, setTodayIso] = useState<string>('2026-11-22');

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
    const [pkgRes, bookRes, mediaRes] = await Promise.all([
      supabase
        .from('event_packages')
        .select('*')
        .eq('active', true)
        .order('base_price', { ascending: true }),
      supabase
        .from('event_bookings')
        .select('id, floor_zone, event_date, event_time, tables_count'),
      supabase
        .from('event_media')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (!pkgRes.error && pkgRes.data && pkgRes.data.length > 0) {
      const loaded = pkgRes.data as EventPackage[];
      setPackages(loaded);
      setSelectedPackageId((prev) => prev || loaded.at(0)?.id || '');
    }

    if (!bookRes.error && bookRes.data) {
      setBookings(bookRes.data as ExistingBooking[]);
    }

    if (!mediaRes.error && mediaRes.data && mediaRes.data.length > 0) {
      setMediaItems(mediaRes.data as EventMediaItem[]);
    }
  };

  useEffect(() => {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(hoy.getDate()).padStart(2, '0')}`;
    setViewDate(hoy);
    setSelectedDate(iso);
    setTodayIso(iso);
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

  const getEmbedVideoUrl = (url: string) => {
    if (url.includes('://youtube.com')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return id ? `https://youtube.com{id}` : null;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return id ? `https://youtube.com{id}` : null;
    }
    return null;
  };

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

  const filteredMedia = mediaItems.filter((item) =>
    mediaFilter === 'ALL' ? true : item.media_type === mediaFilter
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-amber-400 selection:text-black">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-[750px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-yellow-400/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090A0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
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
            href="#barra-cotizador-vip"
            className="rounded-full bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] px-4 py-2 text-xs font-extrabold text-gray-950 shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-transform hover:scale-105"
          >
            Cotizar Fecha
          </a>
        </div>
      </header>

      <section className="relative border-b border-amber-500/15 py-9 sm:py-12">
        <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
            <Crown className="h-4 w-4 text-amber-400" />
            <span>SALONES VIP 2DO Y 3ER PISO • CASTILLO&apos;S PIZZA</span>
          </div>

          <h1 className="mx-auto mt-4 max-w-4xl bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            Vive tus Eventos en Castillo&apos;s Pizza
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
            Explora fotos y videos reales de nuestras celebraciones en el{' '}
            <strong className="text-amber-300">Tercer Piso VIP</strong> y{' '}
            <strong className="text-amber-300">Segundo Piso Social</strong>, y
            calcula tu presupuesto en la barra lateral.
          </p>
        </div>
      </section>

      <main className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* COLUMNA PRINCIPAL IZQUIERDA (7 COL): GALERÍA DE FOTOS Y VIDEOS + PAQUETES */}
          <div className="space-y-12 lg:col-span-7">
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <span>Galería Real de Eventos &amp; Salones</span>
                </h2>

                <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-[#101118] p-1">
                  <button
                    type="button"
                    onClick={() => setMediaFilter('ALL')}
                    className={`rounded-full px-3.5 py-1 text-xs font-extrabold transition-all ${
                      mediaFilter === 'ALL'
                        ? 'bg-amber-400 text-gray-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todo ({mediaItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('VIDEO')}
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-extrabold transition-all ${
                      mediaFilter === 'VIDEO'
                        ? 'bg-amber-400 text-gray-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Play className="h-3 w-3" />
                    <span>Videos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('PHOTO')}
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-extrabold transition-all ${
                      mediaFilter === 'PHOTO'
                        ? 'bg-amber-400 text-gray-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    <span>Fotos</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredMedia.map((item, idx) => {
                  const embedUrl =
                    item.media_type === 'VIDEO'
                      ? getEmbedVideoUrl(item.media_url)
                      : null;

                  return (
                    <article
                      key={item.id}
                      onClick={() => setLightboxItem(item)}
                      className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-amber-500/25 bg-[#0E0F15] shadow-xl transition-all hover:border-amber-400/70 ${
                        idx === 0 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div
                        className={`relative w-full overflow-hidden bg-black ${
                          idx === 0 ? 'h-72 sm:h-96' : 'h-60'
                        }`}
                      >
                        {item.media_type === 'VIDEO' ? (
                          embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title={item.title}
                              className="h-full w-full object-cover"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={item.media_url}
                              controls
                              muted
                              loop
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          )
                        ) : (
                          <img
                            src={item.media_url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-black/75 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                            {item.media_type === 'VIDEO' ? (
                              <Play className="h-3 w-3 text-amber-400" />
                            ) : (
                              <Camera className="h-3 w-3 text-amber-400" />
                            )}
                            <span>{item.floor_tag}</span>
                          </span>
                        </div>

                        <div className="absolute right-4 bottom-4 left-4">
                          <h3 className="text-base font-extrabold text-white sm:text-lg">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-semibold text-amber-300/90">
                            Haz clic para ver en pantalla completa
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* PAQUETES VIP DISPONIBLES */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                  <PartyPopper className="h-5 w-5 text-amber-400" />
                  <span>Paquetes &amp; Experiencias VIP</span>
                </h2>
                <span className="text-xs font-bold text-amber-300/80">
                  Elige un paquete para cotizar
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <article
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`cursor-pointer rounded-3xl border p-5 transition-all duration-300 ${
                      selectedPackageId === pkg.id
                        ? 'border-amber-400 bg-gradient-to-b from-amber-400/15 to-[#0D0E14] shadow-[0_0_30px_rgba(250,204,21,0.2)]'
                        : 'border-amber-500/20 bg-[#0E0F15] hover:border-amber-400/50'
                    }`}
                  >
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                      {pkg.category}
                    </span>

                    <h3 className="mt-2.5 text-base font-extrabold text-white">
                      {pkg.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
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
          </div>
          {/* BARRA LATERAL FLOTANTE DERECHA (5 COL): CALENDARIO, PISOS Y COTIZADOR VIP */}
          <aside
            id="barra-cotizador-vip"
            className="space-y-5 lg:sticky lg:top-24 lg:col-span-5"
          >
            <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#14151F] to-[#0A0B0F] p-5 shadow-[0_0_45px_rgba(250,204,21,0.14)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-amber-300">
                    <Calculator className="h-5 w-5" />
                    <span>Cotizador &amp; Agenda VIP</span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Elige fecha, piso, mesas y calcula al instante
                  </p>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase text-zinc-400">
                    Inversión Est.
                  </span>
                  <span className="bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-lg font-extrabold text-transparent">
                    {formatPrice(estimatedTotal)}
                  </span>
                </div>
              </div>

              {/* Mini Calendario Mensual en Vivo */}
              <div className="mt-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                    <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
                    <span>1. Fecha del Evento</span>
                  </span>

                  <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-black/50 px-2.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setViewDate(new Date(year, month - 1, 1))}
                      className="p-0.5 text-amber-300 hover:text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[105px] text-center text-[11px] font-extrabold capitalize text-amber-200">
                      {monthName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewDate(new Date(year, month + 1, 1))}
                      className="p-0.5 text-amber-300 hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-extrabold uppercase text-zinc-500">
                  <span>Do</span>
                  <span>Lu</span>
                  <span>Ma</span>
                  <span>Mi</span>
                  <span>Ju</span>
                  <span>Vi</span>
                  <span>Sá</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-8" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const iso = `${year}-${String(month + 1).padStart(
                      2,
                      '0'
                    )}-${String(dayNum).padStart(2, '0')}`;
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
                        className={`relative flex h-8 flex-col items-center justify-center rounded-lg border text-[11px] font-extrabold transition-all ${
                          isPast
                            ? 'cursor-not-allowed border-transparent bg-white/2 text-zinc-700'
                            : isSelected
                            ? 'border-amber-300 bg-gradient-to-br from-[#FDE047] to-[#D97706] text-gray-950 shadow-sm'
                            : dayBookingsCount >= 6
                            ? 'border-red-500/40 bg-red-950/30 text-red-300'
                            : dayBookingsCount > 0
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                            : 'border-white/10 bg-white/5 text-zinc-200 hover:border-amber-400/60'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {!isPast && dayBookingsCount > 0 && !isSelected && (
                          <span className="h-1 w-1 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Piso (3er Piso VIP / 2do Piso Social) */}
              <div className="mt-4 border-t border-white/10 pt-3.5">
                <label className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-white">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span>2. Piso y Horario ({selectedDate})</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
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
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          active
                            ? 'border-amber-400 bg-amber-400/15'
                            : 'border-white/10 bg-black/40 hover:border-amber-500/40'
                        }`}
                      >
                        <span className="block text-[9px] font-extrabold text-amber-300">
                          {floor.badge}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-extrabold text-white">
                          {floor.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {TIME_SLOTS.map((slot) => {
                    const isBusy = occupiedSlotsForSelection.includes(slot);
                    const isChosen = selectedTime === slot && !isBusy;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-lg border py-1.5 text-[11px] font-extrabold transition-all ${
                          isBusy
                            ? 'cursor-not-allowed border-red-500/30 bg-red-950/30 text-red-400 line-through'
                            : isChosen
                            ? 'border-amber-300 bg-gradient-to-r from-[#FACC15] to-[#D97706] text-gray-950'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-amber-400'
                        }`}
                      >
                        {isBusy ? 'Ocupado' : slot}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Formulario de Cotización y Reserva VIP */}
              <form
                onSubmit={handleConfirmEventBooking}
                className="mt-4 space-y-3 border-t border-white/10 pt-3.5"
              >
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-amber-200">
                    3. Paquete Seleccionado
                  </label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/30 bg-black/80 px-3 py-2 text-xs font-extrabold text-white focus:border-amber-400 focus:outline-none"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} (Base {formatPrice(Number(pkg.base_price))})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-amber-200">
                      Mesas (Máx {currentFloorObj.maxTables})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentFloorObj.maxTables}
                      value={tablesCount}
                      onChange={(e) => {
                        const val = Math.max(
                          1,
                          Math.min(
                            currentFloorObj.maxTables,
                            Number(e.target.value)
                          )
                        );
                        setTablesCount(val);
                        setGuestCount(val * 4);
                      }}
                      className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-2 text-xs font-extrabold text-amber-300 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-amber-200">
                      Personas Est.
                    </label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-extrabold text-zinc-200">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
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

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Tu Nombre *"
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="WhatsApp / Celular"
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas (Decoración, torta, platos favoritos...)"
                  className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />

                <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>
                      {currentFloorObj.label} • {selectedTime}
                    </span>
                    <span className="font-bold text-amber-200">
                      {tablesCount} mesa(s)
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between border-t border-amber-400/25 pt-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                      Total Cotizado
                    </span>
                    <span className="bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-xl font-extrabold text-transparent">
                      {formatPrice(estimatedTotal)}
                    </span>
                  </div>
                </div>

                {bookingConfirmed && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2.5 text-[11px] font-extrabold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      ¡Fecha reservada! Abriendo WhatsApp para confirmar.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isBooking || occupiedSlotsForSelection.includes(selectedTime)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] py-3.5 text-xs font-extrabold uppercase tracking-wider text-gray-950 shadow-[0_0_25px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.01] disabled:opacity-40"
                >
                  <MessageCircle className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {isBooking
                      ? 'Agendando...'
                      : 'Agendar Fecha y Enviar a WhatsApp'}
                  </span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      </main>

      {/* VISOR EN PANTALLA COMPLETA (LIGHTBOX) PARA FOTOS Y VIDEOS */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-400/40 bg-[#0D0E14] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  {lightboxItem.floor_tag}
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  {lightboxItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="rounded-full bg-white/10 p-2 text-zinc-300 hover:bg-amber-400 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {lightboxItem.media_type === 'VIDEO' ? (
                getEmbedVideoUrl(lightboxItem.media_url) ? (
                  <iframe
                    src={getEmbedVideoUrl(lightboxItem.media_url)!}
                    title={lightboxItem.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={lightboxItem.media_url}
                    controls
                    autoPlay
                    className="h-full w-full object-contain"
                  />
                )
              ) : (
                <img
                  src={lightboxItem.media_url}
                  alt={lightboxItem.title}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
