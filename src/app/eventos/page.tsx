'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Users,
  PartyPopper,
  Play,
  MessageCircle,
  CheckCircle2,
  Camera,
  Crown,
  Zap,
} from 'lucide-react';

const RESTAURANT_WHATSAPP = '573045959660';

interface EventExperience {
  id: string;
  title: string;
  category: 'Cumpleaños' | 'Corporativo' | 'Social';
  guests: string;
  description: string;
  mediaType: 'VIDEO' | 'PHOTO';
  badge: string;
  highlights: string[];
}

const EXPERIENCES: EventExperience[] = [
  {
    id: 'cumpleanos-vip',
    title: 'Cumpleaños & Celebraciones VIP',
    category: 'Cumpleaños',
    guests: '10 a 40 invitados',
    badge: 'MÁS SOLICITADO',
    description:
      'Ambientación especial en zona reservada, combos de pizzas familiares, granizadas artesanales y atención dedicada de nuestro equipo de meseros.',
    mediaType: 'VIDEO',
    highlights: [
      'Zona VIP reservada y ambientada',
      'Combos de Pizzas Especiales y Picadas',
      'Servicio prioritario en mesa',
    ],
  },
  {
    id: 'eventos-empresariales',
    title: 'Eventos Corporativos & Ejecutivos',
    category: 'Corporativo',
    guests: '15 a 60 invitados',
    badge: 'FACTURACIÓN DIAN',
    description:
      'Integraciones de equipo, cenas empresariales y lanzamientos con menú a la carta de carnes, pastas, hamburguesas y facturación electrónica DIAN.',
    mediaType: 'PHOTO',
    highlights: [
      'Factura Electrónica DIAN inmediata',
      'Capacidad hasta 36 mesas conectadas',
      'Menú ejecutivo o personalizado',
    ],
  },
  {
    id: 'noches-amigos',
    title: 'Noches de Amigos, Deportes & Barra',
    category: 'Social',
    guests: '4 a 20 invitados',
    badge: 'EXPERIENCIA LIVE',
    description:
      'Vive los partidos y fechas especiales con pantallas HD, pizzetas artesanales recién horneadas, alitas y coctelería en nuestra zona de barra.',
    mediaType: 'VIDEO',
    highlights: [
      'Zona de Barra exclusiva (7 puestos)',
      'Pantallas HD de alta definición',
      'Coctelería, cervezas y picadas al instante',
    ],
  },
];

export default function EventosPage() {
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'VIDEO' | 'PHOTO'>('ALL');
  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('15');
  const [eventType, setEventType] = useState('Cumpleaños');
  const [notes, setNotes] = useState('');

  const filteredExperiences = EXPERIENCES.filter(
    (exp) => mediaFilter === 'ALL' || exp.mediaType === mediaFilter
  );

  const handleQuoteWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !eventDate) return;

    const text = [
      `✨ *RESERVA DE EVENTO VIP - CASTILLO'S PIZZA*`,
      `*Cliente:* ${clientName.trim()}`,
      `*Experiencia:* ${eventType}`,
      `*Fecha del Evento:* ${eventDate}`,
      `*Invitados:* ${guestCount} personas`,
      notes.trim() ? `*Requerimientos:* ${notes.trim()}` : '',
      ``,
      `Hola, deseo reservar y cotizar este evento en Castillo's Pizza.`,
    ]
      .filter(Boolean)
      .join('\n');

    const encodedMessage = encodeURIComponent(text);
    const urlWeb = `https://wa.me{RESTAURANT_WHATSAPP}?text=${encodedMessage}`;
    const urlApp = `whatsapp://send?phone=${RESTAURANT_WHATSAPP}&text=${encodedMessage}`;
    const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (esMovil) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (!document.hidden) window.location.href = urlWeb;
      }, 1500);
    } else {
      window.open(urlWeb, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-amber-400 selection:text-black">
      {/* Resplandores Ambientales Tecnológicos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-yellow-400/10 blur-[120px]" />
      </div>

      {/* Cabecera Oscura Metalizada */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090A0F]/85 backdrop-blur-xl">
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
            href="#cotizar-evento"
            className="rounded-full bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] px-4 py-2 text-xs font-extrabold text-gray-950 shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-transform hover:scale-105"
          >
            Reservar VIP
          </a>
        </div>
      </header>

      {/* Hero Ultra Tecnológico en Negro Mate y Dorado Metálico */}
      <section className="relative border-b border-amber-500/15 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
            <Crown className="h-4 w-4 text-amber-400" />
            <span>CASTILLO&apos;S EXPERIENCE • EVENTOS DE OTRO NIVEL</span>
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Celebraciones Mágicas &amp; Experiencias VIP
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Cumpleaños, eventos corporativos y noches especiales en un ambiente
            exclusivo con pantallas HD, servicio inteligente en 36 mesas y el
            sabor legendario de Castillo&apos;s Pizza.
          </p>

          {/* Filtros Interactivos de Galería */}
          <div className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-white/5 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setMediaFilter('ALL')}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all ${
                mediaFilter === 'ALL'
                  ? 'bg-gradient-to-r from-[#FACC15] to-[#D97706] text-gray-950 shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Todas las Experiencias
            </button>
            <button
              onClick={() => setMediaFilter('VIDEO')}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all ${
                mediaFilter === 'VIDEO'
                  ? 'bg-gradient-to-r from-[#FACC15] to-[#D97706] text-gray-950 shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Videos Live
            </button>
            <button
              onClick={() => setMediaFilter('PHOTO')}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all ${
                mediaFilter === 'PHOTO'
                  ? 'bg-gradient-to-r from-[#FACC15] to-[#D97706] text-gray-950 shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Galería Fotos
            </button>
          </div>
        </div>
      </section>

      <main className="relative mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        {/* Cuadrícula Futurista de Experiencias */}
        <section>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-xl font-extrabold text-white sm:text-2xl">
              <PartyPopper className="h-6 w-6 text-amber-400" />
              <span>Escenarios &amp; Paquetes Reales</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300/90">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Atención personalizada en Bucaramanga</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {filteredExperiences.map((exp) => (
              <article
                key={exp.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-b from-[#13141B] to-[#0B0C10] shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-[0_0_35px_rgba(250,204,21,0.2)]"
              >
                <div>
                  {/* Visor Multimedia Metálico */}
                  <div className="relative flex h-56 flex-col items-center justify-center overflow-hidden border-b border-amber-500/20 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.18),rgba(10,10,14,0.95))] p-6 text-center">
                    <span className="absolute left-4 top-4 rounded-full border border-amber-400/40 bg-black/70 px-3 py-1 text-[10px] font-extrabold tracking-wider text-amber-300 backdrop-blur-md">
                      {exp.badge}
                    </span>

                    {exp.mediaType === 'VIDEO' ? (
                      <div className="flex flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#D97706] via-[#FACC15] to-[#FEF08A] text-gray-950 shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-transform duration-300 group-hover:scale-110">
                          <Play className="ml-0.5 h-7 w-7 fill-gray-950" />
                        </div>
                        <span className="mt-3 text-xs font-extrabold tracking-wide text-amber-200">
                          VIDEO EXPERIENCIA EN VIVO
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/15 text-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.25)] transition-transform duration-300 group-hover:scale-110">
                          <Camera className="h-7 w-7" />
                        </div>
                        <span className="mt-3 text-xs font-extrabold tracking-wide text-amber-200">
                          GALERÍA HD DEL EVENTO
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Users className="h-4 w-4" />
                      <span>{exp.guests}</span>
                    </div>

                    <h3 className="mt-2 text-lg font-extrabold text-white">
                      {exp.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {exp.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {exp.highlights.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-xs font-bold text-zinc-200"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <a
                    href="#cotizar-evento"
                    onClick={() => setEventType(exp.category)}
                    className="block w-full rounded-2xl border border-amber-400/50 bg-amber-400/10 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-amber-300 transition-all hover:bg-gradient-to-r hover:from-[#FACC15] hover:to-[#D97706] hover:text-gray-950"
                  >
                    Cotizar esta Experiencia
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        {/* Formulario Futurista de Cotización VIP */}
        <section
          id="cotizar-evento"
          className="relative overflow-hidden rounded-3xl border border-amber-400/35 bg-gradient-to-br from-[#14151D] via-[#0D0E13] to-[#08080B] p-6 shadow-[0_0_50px_rgba(250,204,21,0.12)] sm:p-10"
        >
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-extrabold text-amber-300">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>CONEXIÓN DIRECTA CON COORDINACIÓN DE EVENTOS</span>
              </span>
              <h2 className="mt-3 bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#D97706] bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                Reserva tu Fecha VIP
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 sm:text-sm">
                Completa los datos de tu celebración y recibe atención
                inmediata por WhatsApp.
              </p>
            </div>

            <form onSubmit={handleQuoteWhatsApp} className="mt-8 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200/90">
                    Tu Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Laura Martínez"
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200/90">
                    Tipo de Celebración
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/25 bg-black/80 px-4 py-3 text-sm font-bold text-amber-200 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Cumpleaños">Cumpleaños VIP</option>
                    <option value="Corporativo">Reunión Empresarial</option>
                    <option value="Grado / Aniversario">
                      Grado / Aniversario
                    </option>
                    <option value="Social">Noche de Amigos / Barra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200/90">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-amber-200/90">
                    Número de Invitados
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={150}
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-3 text-sm font-extrabold text-amber-300 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-200/90">
                  Detalles especiales (decoración, platos preferidos, horario)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cuéntanos cómo imaginas tu evento..."
                  className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#D97706] py-4 text-sm font-extrabold uppercase tracking-wider text-gray-950 shadow-[0_0_30px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(250,204,21,0.55)] active:scale-98"
              >
                <MessageCircle className="h-5 w-5 stroke-[2.5]" />
                <span>Enviar Solicitud VIP por WhatsApp</span>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
