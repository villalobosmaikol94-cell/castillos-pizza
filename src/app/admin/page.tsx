'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MENU_CATEGORIES, MENU_PRODUCTS } from '@/data/menuData';
import { MenuCategory, Product } from '@/types/restaurant';
import { supabase } from '@/lib/supabase';
import AccountingDashboard from '@/components/AccountingDashboard';
import InventoryExpensesManager from '@/components/InventoryAndExpensesManager';
import StaffAndInvoicesManager from '@/components/StaffAndInvoicesManager';
import EventsAdminManager from '@/components/EventsAdminManager';
import TableQRGenerator from '@/components/QrTablesGenerator';
import {
  Lock,
  ArrowLeft,
  UtensilsCrossed,
  BarChart3,
  Package,
  Users,
  PartyPopper,
  QrCode,
  ShieldCheck,
  Tv,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  RotateCcw,
  Camera,
Upload,

} from 'lucide-react';

const MASTER_ADMIN_PIN = '1989';

type AdminTab =
  | 'CARTA'
  | 'CONTABILIDAD'
  | 'INVENTARIO'
  | 'PERSONAL'
  | 'EVENTOS'
  | 'QR';

export default function AdminSecretPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('CARTA');

  const [items, setItems] = useState<Product[]>(MENU_PRODUCTS);
  const [searchMenu, setSearchMenu] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('Todas');

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<MenuCategory>('Pizza');
  const [newPrice, setNewPrice] = useState('');
  const [newStation, setNewStation] = useState<'COCINA' | 'BARRA'>('COCINA');
  const [newDesc, setNewDesc] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
const [editImageUrl, setEditImageUrl] = useState('');
const [uploadingDishPhoto, setUploadingDishPhoto] = useState(false);

const uploadProductPhoto = async (file: File): Promise<string | null> => {
  if (!supabase) return null;
  setUploadingDishPhoto(true);
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `dish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('menu-photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (upErr) {
      alert(`Error subiendo foto: ${upErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from('menu-photos').getPublicUrl(fileName);
    return data.publicUrl;
  } finally {
    setUploadingDishPhoto(false);
  }
};

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === MASTER_ADMIN_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Clave de Administrador incorrecta.');
    }
  };

  useEffect(() => {
    if (!unlocked) return;

    const loadMenu = async () => {
      if (supabase) {
        const { data, error: fetchError } = await supabase
          .from('menu_items')
          .select('*')
          .order('created_at', { ascending: true });

        if (!fetchError && data && data.length > 0) {
          const mapped: Product[] = data.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            description: String(row.description || ''),
            price: Number(row.base_price || row.price || 0),
            category: row.category as MenuCategory,
            station: (row.station as 'COCINA' | 'BARRA') || 'COCINA',
            popular: Boolean(row.popular),
            available: row.available !== false,
            options: row.options || undefined,
          }));
          setItems(mapped);
          return;
        }
      }

      const saved = localStorage.getItem('castillos_custom_menu');
      if (saved) {
        try {
          setItems(JSON.parse(saved) as Product[]);
        } catch {
          setItems([]);
        }
      }
    };

    loadMenu();
  }, [unlocked]);
  const syncMenuChanges = async (updatedList: Product[]) => {
   setItems(MENU_PRODUCTS);
    localStorage.setItem('castillos_custom_menu', JSON.stringify(updatedList));
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;

    const newItem: Product = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      description:
        newDesc.trim() || 'Preparación especial de Castillo’s Pizza.',
      price: Number(newPrice),
      category: newCategory,
      station: newStation,
      available: true,
    };

    if (supabase) {
      await supabase.from('menu_items').insert([
        {
          id: newItem.id,
          name: newItem.name,
          description: newItem.description,
          base_price: newItem.price,
          category: newItem.category,
          station: newItem.station,
          available: true,
        },
      ]);
    }

    await syncMenuChanges([newItem, ...items]);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
  };

  const startEditing = (item: Product) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditDesc(item.description);
    setEditAvailable(item.available !== false);
    setEditImageUrl(item.imageUrl || '');

  };

  const saveEdit = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            name: editName.trim() || item.name,
            price: Number(editPrice) || item.price,
            description: editDesc.trim(),
            available: editAvailable,
            image_url: editImageUrl || null,
            imageUrl: editImageUrl || undefined,
          }
        : item
        
    );

    if (supabase) {
      await supabase
        .from('menu_items')
        .update({
          name: editName.trim(),
          base_price: Number(editPrice),
          description: editDesc.trim(),
          available: editAvailable,
        })
        .eq('id', id);
    }

    await syncMenuChanges(updated);
    setEditingId(null);
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm('¿Eliminar este producto de la carta?')) return;
    if (supabase) {
      await supabase.from('menu_items').delete().eq('id', id);
    }
    await syncMenuChanges(items.filter((i) => i.id !== id));
  };

  const handleReloadFromCloud = async () => {
    if (!supabase) return;
    const { data, error: fetchError } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (!fetchError && data) {
      const mapped: Product[] = data.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        description: String(row.description || ''),
        price: Number(row.base_price || row.price || 0),
        category: row.category as MenuCategory,
        station: (row.station as 'COCINA' | 'BARRA') || 'COCINA',
        popular: Boolean(row.popular),
        available: row.available !== false,
        options: row.options || undefined,
        imageUrl: row.image_url ? String(row.image_url) : undefined,

      }));
      await syncMenuChanges(mapped);
    }
  };
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const filteredMenu = items.filter((item) => {
    const matchesCat =
      selectedCat === 'Todas' || item.category === selectedCat;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchMenu.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-[#FACC15]">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Acceso Administrador
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Área restringida para el propietario de Castillo&apos;s Pizza
          </p>

          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 text-center text-2xl font-extrabold tracking-[0.4em] text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
              autoFocus
            />

            {error && <p className="text-xs font-bold text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-[#FACC15] shadow-sm hover:bg-gray-800"
            >
              Desbloquear Panel Admin
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
                <span>Tienda Pública</span>
              </Link>

              <div className="relative h-10 w-24">
                <Image
                  src="/logo-castillos.png"
                  alt="Castillo's Pizza"
                  fill
                  className="object-contain"
                />
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-extrabold text-[#FACC15]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Panel Dueño</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tv-cocina"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gray-800 hover:border-amber-400 hover:bg-amber-50"
              >
                <Tv className="h-3.5 w-3.5 text-amber-600" />
                <span>Abrir TV Cocina</span>
              </Link>

              <Link
                href="/asistencia"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-extrabold text-gray-800 hover:border-emerald-400 hover:bg-emerald-50"
              >
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Reloj Asistencia</span>
              </Link>
            </div>
          </div>

          <nav className="mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-gray-100 pt-2.5 pb-1">
            <button
              onClick={() => setActiveTab('CARTA')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'CARTA'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Carta y Precios</span>
            </button>

            <button
              onClick={() => setActiveTab('CONTABILIDAD')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'CONTABILIDAD'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Contabilidad</span>
            </button>

            <button
              onClick={() => setActiveTab('INVENTARIO')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'INVENTARIO'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Inventario y Gastos</span>
            </button>

            <button
              onClick={() => setActiveTab('PERSONAL')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'PERSONAL'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>18 Meseros y Facturas</span>
            </button>

            <button
              onClick={() => setActiveTab('EVENTOS')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'EVENTOS'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PartyPopper className="h-3.5 w-3.5" />
              <span>Eventos VIP</span>
            </button>

            <button
              onClick={() => setActiveTab('QR')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                activeTab === 'QR'
                  ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Códigos QR</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'CONTABILIDAD' && <AccountingDashboard />}
        {activeTab === 'INVENTARIO' && <InventoryExpensesManager />}
        {activeTab === 'PERSONAL' && <StaffAndInvoicesManager />}
        {activeTab === 'EVENTOS' && <EventsAdminManager />}
        {activeTab === 'QR' && <TableQRGenerator />}

        {activeTab === 'CARTA' && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Agregar Nuevo Plato o Bebida a la Carta
                  </h2>
                  <p className="text-xs text-gray-500">
                    Los cambios se reflejan inmediatamente en el menú digital y en
                    las comandas
                  </p>
                </div>

                <button
                  onClick={handleReloadFromCloud}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Sincronizar desde Nube</span>
                </button>
              </div>

              <form
                onSubmit={handleAddDish}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre del producto"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                />

                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as MenuCategory)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                >
                  {MENU_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  required
                  min={500}
                  step={100}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Precio ($ COP)"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                />

                <select
                  value={newStation}
                  onChange={(e) =>
                    setNewStation(e.target.value as 'COCINA' | 'BARRA')
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                >
                  <option value="COCINA">Estación: COCINA</option>
                  <option value="BARRA">Estación: BARRA / BEBIDAS</option>
                </select>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2.5 text-xs font-extrabold text-gray-900 shadow-2xs hover:bg-amber-400"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar a Carta</span>
                </button>

                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción breve e ingredientes (opcional)..."
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-800 focus:border-amber-400 focus:bg-white focus:outline-none sm:col-span-2 lg:col-span-5"
                />
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/70 px-3.5 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-100">
            <Camera className="h-4 w-4 text-amber-600" />
            <span>
              {uploadingDishPhoto
                ? 'Subiendo foto...'
                : newImageUrl
                ? '✅ Foto lista'
                : 'Subir Foto del Plato (Celular / PC)'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.item(0);
                if (f) {
                  const url = await uploadProductPhoto(f);
                  if (url) setNewImageUrl(url);
                }
              }}
            />
          </label>

              </form>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchMenu}
                    onChange={(e) => setSearchMenu(e.target.value)}
                    placeholder="Buscar producto en carta..."
                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedCat('Todas')}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      selectedCat === 'Todas'
                        ? 'bg-gray-900 text-[#FACC15]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todas ({items.length})
                  </button>
                  {MENU_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCat(cat)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        selectedCat === cat
                          ? 'bg-gray-900 text-[#FACC15]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredMenu.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-3.5"
                    >
                      {isEditing ? (
                        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-extrabold text-gray-900"
                          />
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-extrabold text-gray-900"
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            
                            className="rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs text-gray-800"
                          />
                                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-950 hover:bg-amber-100">
            <Upload className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {uploadingDishPhoto
                ? 'Subiendo...'
                : editImageUrl
                ? 'Cambiar Foto'
                : 'Subir Foto'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.item(0);
                if (f) {
                  const url = await uploadProductPhoto(f);
                  if (url) setEditImageUrl(url);
                }
              }}
            />
          </label>

                          <div className="flex items-center justify-end gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={editAvailable}
                                onChange={(e) =>
                                  setEditAvailable(e.target.checked)
                                }
                                className="rounded text-amber-500"
                              />
                              <span>Disponible</span>
                            </label>
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="max-w-xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-gray-900">
                                {item.name}
                              </span>
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                {item.category}
                              </span>
                              {item.available === false && (
                                <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                                  AGOTADO
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-emerald-700">
                              {formatPrice(item.price)}
                            </span>

                            <button
                              onClick={() => startEditing(item)}
                              className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-600 hover:border-amber-400 hover:bg-amber-50 hover:text-gray-900"
                              title="Editar precio o disponibilidad"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteDish(item.id)}
                              className="rounded-xl border border-red-100 bg-red-50/70 p-2 text-red-600 hover:bg-red-600 hover:text-white"
                              title="Eliminar producto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
