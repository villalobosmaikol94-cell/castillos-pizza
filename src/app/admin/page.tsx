'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MENU_CATEGORIES } from '@/data/menuData';
import { MenuCategory, PrintStation, Product } from '@/types/restaurant';
import {
  getStoredMenu,
  saveStoredMenu,
  resetStoredMenu,
} from '@/lib/menuStorage';
import AccountingDashboard from '@/components/AccountingDashboard';
import {
  Lock,
  ArrowLeft,
  Plus,
  Search,
  Check,
  X,
  RotateCcw,
  ChefHat,
  Wine,
  Eye,
  EyeOff,
  Pencil,
  Utensils,
  BarChart3,
} from 'lucide-react';

const ADMIN_PIN = '1989';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'MENU' | 'CONTABILIDAD'>('MENU');

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<MenuCategory | 'Todas'>('Todas');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState<MenuCategory>('Pizza');
  const [newStation, setNewStation] = useState<PrintStation>('COCINA');

  useEffect(() => {
    setProducts(getStoredMenu());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const toggleAvailability = (id: string) => {
    const updated = products.map((p) =>
      p.id === id ? { ...p, available: p.available === false ? true : false } : p
    );
    setProducts(updated);
    saveStoredMenu(updated);
  };

  const startEditingPrice = (product: Product) => {
    setEditingId(product.id);
    setTempPrice(String(product.price));
  };

  const saveEditedPrice = (id: string) => {
    const numericPrice = Number(tempPrice);
    if (!numericPrice || numericPrice < 0) return;

    const updated = products.map((p) =>
      p.id === id ? { ...p, price: numericPrice } : p
    );
    setProducts(updated);
    saveStoredMenu(updated);
    setEditingId(null);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;

    const created: Product = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Especialidad de la casa.',
      price: Number(newPrice),
      category: newCategory,
      station: newCategory === 'Bebidas' ? 'BARRA' : newStation,
      available: true,
    };

    const updated = [created, ...products];
    setProducts(updated);
    saveStoredMenu(updated);

    setNewName('');
    setNewDesc('');
    setNewPrice('');
    setShowNewModal(false);
  };

  const handleReset = () => {
    if (confirm('¿Deseas restaurar todos los precios y platos originales?')) {
      setProducts(resetStoredMenu());
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Administración Castillo&apos;s
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Ingresa el PIN de acceso para gestionar precios y contabilidad
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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

            {pinError && (
              <p className="text-xs font-bold text-red-600">
                PIN incorrecto. Intenta nuevamente.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#FACC15] py-3.5 text-sm font-extrabold text-gray-900 shadow-sm hover:bg-amber-400"
            >
              Ingresar al Panel
            </button>
          </form>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a la tienda</span>
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      filterCategory === 'Todas' || p.category === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      {/* Cabecera Administrativa con Pestañas */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-amber-300 hover:bg-amber-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ver Tienda</span>
            </Link>

            <div className="relative h-10 w-24">
              <Image
                src="/logo-castillos.png"
                alt="Castillo's Pizza"
                fill
                className="object-contain"
              />
            </div>

            {/* Selector de Pestañas: Carta vs Contabilidad */}
            <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-100/80 p-1">
              <button
                onClick={() => setActiveTab('MENU')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'MENU'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Utensils className="h-3.5 w-3.5 text-amber-600" />
                <span>Carta y Precios</span>
              </button>

              <button
                onClick={() => setActiveTab('CONTABILIDAD')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'CONTABILIDAD'
                    ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-gray-900" />
                <span>Contabilidad</span>
              </button>
            </div>
          </div>

          {activeTab === 'MENU' && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                title="Restaurar carta original"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Restaurar</span>
              </button>

              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FACC15] px-4 py-2.5 text-xs font-extrabold text-gray-900 shadow-xs hover:bg-amber-400"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Nuevo Plato</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'CONTABILIDAD' ? (
          <AccountingDashboard />
        ) : (
          <>
            {/* Filtros de Búsqueda y Categoría */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar plato para editar precio o disponibilidad..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as MenuCategory | 'Todas')
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 focus:border-amber-400 focus:outline-none"
              >
                <option value="Todas">Todas las categorías</option>
                {MENU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Productos Editables */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const isAvailable = product.available !== false;
                const isEditing = editingId === product.id;

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                      isAvailable
                        ? 'border-gray-200 bg-white shadow-2xs'
                        : 'border-gray-200/70 bg-gray-100/70 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            product.station === 'BARRA'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {product.station === 'BARRA' ? (
                            <Wine className="h-3 w-3" />
                          ) : (
                            <ChefHat className="h-3 w-3" />
                          )}
                          {product.category}
                        </span>

                        <button
                          onClick={() => toggleAvailability(product.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold transition-colors ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              <span>Disponible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              <span>Agotado</span>
                            </>
                          )}
                        </button>
                      </div>

                      <h3 className="mt-2.5 text-base font-extrabold text-gray-900">
                        {product.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      {isEditing ? (
                        <div className="flex w-full items-center gap-2">
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="w-full rounded-xl border border-amber-400 bg-amber-50/40 px-3 py-1.5 text-sm font-extrabold text-gray-900 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditedPrice(product.id)}
                            className="rounded-xl bg-emerald-500 p-2 text-white hover:bg-emerald-600"
                            title="Guardar precio"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xl bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-lg font-extrabold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                          <button
                            onClick={() => startEditingPrice(product)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-amber-400 hover:bg-amber-50"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            <span>Editar Precio</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      {/* Modal para Crear Nuevo Plato o Bebida */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">
                Agregar Nuevo Producto
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Nombre del Plato o Bebida
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Pizza Especial de la Casa"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Ingredientes / Descripción
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe los ingredientes..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    Precio (COP)
                  </label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      const cat = e.target.value as MenuCategory;
                      setNewCategory(cat);
                      setNewStation(cat === 'Bebidas' ? 'BARRA' : 'COCINA');
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-gray-600">
                Destino de impresión automático:{' '}
                <strong
                  className={
                    newStation === 'BARRA' ? 'text-sky-700' : 'text-amber-700'
                  }
                >
                  {newStation === 'BARRA' ? 'BARRA / BEBIDAS' : 'COCINA'}
                </strong>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#FACC15] py-3 text-sm font-extrabold text-gray-900 shadow-sm hover:bg-amber-400"
              >
                Guardar y Publicar en Tienda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
