'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PartyPopper,
  Plus,
  Pencil,
  Check,
  X,
  Calendar,
  Trash2,
  Users,
  LayoutGrid,
  Camera,
  Play,
} from 'lucide-react';

export interface EventPackage {
  id: string;
  title: string;
  category: string;
  base_price: number;
  price_per_table: number;
  description: string;
  highlights: string[];
  active: boolean;
}

export interface EventBooking {
  id: string;
  client_name: string;
  client_phone: string | null;
  floor_zone?: string;
  event_date: string;
  event_time: string;
  tables_count: number;
  guest_count: number;
  package_title: string;
  estimated_total: number;
  notes: string | null;
  status: string;
}

export interface EventMediaItem {
  id: string;
  title: string;
  media_type: 'PHOTO' | 'VIDEO';
  media_url: string;
  floor_tag: string;
}

export default function EventsAdminManager() {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [mediaList, setMediaList] = useState<EventMediaItem[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Cumpleaños');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newTablePrice, setNewTablePrice] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editTablePrice, setEditTablePrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaType, setMediaType] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFloor, setMediaFloor] = useState('Tercer Piso VIP');

  const loadEventsData = async () => {
    if (!supabase) return;
    const [pkgRes, bookRes, mediaRes] = await Promise.all([
      supabase
        .from('event_packages')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('event_bookings')
        .select('*')
        .order('event_date', { ascending: true }),
      supabase
        .from('event_media')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (!pkgRes.error && pkgRes.data) setPackages(pkgRes.data as EventPackage[]);
    if (!bookRes.error && bookRes.data)
      setBookings(bookRes.data as EventBooking[]);
    if (!mediaRes.error && mediaRes.data)
      setMediaList(mediaRes.data as EventMediaItem[]);
  };

  useEffect(() => {
    loadEventsData();
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBasePrice || !supabase) return;

    await supabase.from('event_packages').insert([
      {
        title: newTitle.trim(),
        category: newCategory,
        base_price: Number(newBasePrice),
        price_per_table: Number(newTablePrice || 35000),
        description:
          newDesc.trim() || 'Paquete personalizado Castillo’s Pizza.',
        highlights: ['Atención prioritaria', 'Reserva de mesas asegurada'],
        active: true,
      },
    ]);

    setNewTitle('');
    setNewBasePrice('');
    setNewTablePrice('');
    setNewDesc('');
    loadEventsData();
  };

  const handleSaveEdit = async (id: string) => {
    if (!supabase || !editTitle.trim()) return;
    await supabase
      .from('event_packages')
      .update({
        title: editTitle.trim(),
        base_price: Number(editBasePrice || 0),
        price_per_table: Number(editTablePrice || 0),
        description: editDesc.trim(),
      })
      .eq('id', id);

    setEditingId(null);
    loadEventsData();
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || !mediaUrl.trim() || !supabase) return;

    await supabase.from('event_media').insert([
      {
        title: mediaTitle.trim(),
        media_type: mediaType,
        media_url: mediaUrl.trim(),
        floor_tag: mediaFloor,
      },
    ]);

    setMediaTitle('');
    setMediaUrl('');
    loadEventsData();
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('¿Eliminar esta foto/video de la galería?') || !supabase)
      return;
    await supabase.from('event_media').delete().eq('id', id);
    loadEventsData();
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('¿Liberar este horario y eliminar la reserva?') || !supabase)
      return;
    await supabase.from('event_bookings').delete().eq('id', id);
    loadEventsData();
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            <span>Paquetes y Tarifas de Eventos (Editables)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Configura los paquetes, precios base y valor por mesa que verán tus
            clientes en el cotizador de /eventos
          </p>
        </div>

        <form
          onSubmit={handleCreatePackage}
          className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nombre Paquete (Ej: Grado Oro)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800"
          >
            <option value="Cumpleaños">Cumpleaños</option>
            <option value="Corporativo">Corporativo</option>
            <option value="Social">Social / Amigos</option>
          </select>
          <input
            type="number"
            required
            value={newBasePrice}
            onChange={(e) => setNewBasePrice(e.target.value)}
            placeholder="Precio Base ($ COP)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900"
          />
          <input
            type="number"
            required
            value={newTablePrice}
            onChange={(e) => setNewTablePrice(e.target.value)}
            placeholder="Valor por Mesa ($)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Paquete</span>
          </button>
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción breve de lo que incluye este paquete..."
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 sm:col-span-2 lg:col-span-5"
          />
        </form>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {packages.map((pkg) => {
            const isEditing = editingId === pkg.id;
            return (
              <div
                key={pkg.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50/60 p-4"
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-900"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500">
                          Precio Base
                        </label>
                        <input
                          type="number"
                          value={editBasePrice}
                          onChange={(e) => setEditBasePrice(e.target.value)}
                          className="w-full rounded-xl border border-amber-400 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500">
                          Por Mesa
                        </label>
                        <input
                          type="number"
                          value={editTablePrice}
                          onChange={(e) => setEditTablePrice(e.target.value)}
                          className="w-full rounded-xl border border-amber-400 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs text-gray-800"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveEdit(pkg.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-xl bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                          {pkg.category}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(pkg.id);
                            setEditTitle(pkg.title);
                            setEditBasePrice(String(pkg.base_price));
                            setEditTablePrice(String(pkg.price_per_table));
                            setEditDesc(pkg.description);
                          }}
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:border-amber-400"
                          title="Editar paquete"
                        >
                          <Pencil className="h-3.5 w-3.5 text-amber-600" />
                        </button>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-gray-900">
                        {pkg.title}
                      </h4>
                      <p className="mt-1 text-xs text-gray-600">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-gray-200/80 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base paquete:</span>
                        <span className="font-extrabold text-gray-900">
                          {formatPrice(Number(pkg.base_price))}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-gray-500">Adicional por mesa:</span>
                        <span className="font-extrabold text-emerald-700">
                          +{formatPrice(Number(pkg.price_per_table))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Camera className="h-5 w-5 text-amber-500" />
            <span>Galería Multimedia de Eventos (Fotos y Videos Reales)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Publica fotos o videos (enlaces directos .jpg/.png/.mp4 o YouTube)
            para mostrar en la portada principal de /eventos
          </p>
        </div>

               <form
          onSubmit={handleAddMedia}
          className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="text"
            required
            value={mediaTitle}
            onChange={(e) => setMediaTitle(e.target.value)}
            placeholder="Título (Ej: Cumpleaños 3er Piso)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900"
          />
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as 'PHOTO' | 'VIDEO')}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800"
          >
            <option value="PHOTO">Tipo: Foto HD</option>
            <option value="VIDEO">Tipo: Video Live</option>
          </select>
          <select
            value={mediaFloor}
            onChange={(e) => setMediaFloor(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800"
          >
            <option value="Tercer Piso VIP">Tercer Piso VIP</option>
            <option value="Segundo Piso Social">Segundo Piso Social</option>
          </select>
          <input
            type="url"
            required
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Pega enlace de foto o video (https://...)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-[#FACC15] hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            <span>Publicar Media</span>
          </button>
        </form>

        {mediaList.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">
            Aún no has subido fotos o videos reales; se mostrarán los escenarios por defecto.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mediaList.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                    {m.media_type === 'VIDEO' ? (
                      <Play className="h-2.5 w-2.5" />
                    ) : (
                      <Camera className="h-2.5 w-2.5" />
                    )}
                    <span>{m.floor_tag}</span>
                  </span>
                  <p className="mt-1 truncate font-extrabold text-gray-900">
                    {m.title}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-600 hover:text-white"
                  title="Eliminar de galería"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Calendar className="h-5 w-5 text-amber-600" />
            <span>Calendario de Eventos Agendados ({bookings.length})</span>
          </h3>
        </div>

        {bookings.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-400">
            Aún no hay eventos agendados en el calendario.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((bk) => (
              <div
                key={bk.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#FACC15] px-2.5 py-1 font-extrabold text-gray-900">
                      {bk.event_date} • {bk.event_time}
                    </span>
                    <span className="rounded-lg bg-gray-900 px-2.5 py-1 font-extrabold text-[#FACC15]">
                      {bk.floor_zone || 'Tercer Piso VIP'}
                    </span>
                    <span className="font-extrabold text-gray-900">
                      {bk.client_name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-gray-600">
                    Paquete: <strong>{bk.package_title}</strong> •{' '}
                    <LayoutGrid className="inline h-3.5 w-3.5 text-amber-600" />{' '}
                    {bk.tables_count} mesas •{' '}
                    <Users className="inline h-3.5 w-3.5 text-amber-600" />{' '}
                    {bk.guest_count} invitados
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatPrice(Number(bk.estimated_total))}
                  </span>
                  <button
                    onClick={() => handleDeleteBooking(bk.id)}
                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-600 hover:text-white"
                    title="Liberar fecha y eliminar reserva"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
