'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Printer, Sparkles, X } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
}

export default function Navbar({
  searchQuery,
  onSearchChange,
  cartCount,
  cartTotal,
  onOpenCart,
}: NavbarProps) {
  const router = useRouter();
  const [tapCount, setTapCount] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  // Acceso secreto: 3 clics o toques rápidos en el logo llevan directo al PIN de /admin
  const handleSecretLogoTap = (e: React.MouseEvent) => {
    e.preventDefault();

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const nextCount = tapCount + 1;

    if (nextCount >= 3) {
      setTapCount(0);
      router.push('/admin');
      return;
    }

    setTapCount(nextCount);
    resetTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 1000); // Si pasa más de 1 segundo entre toques, se reinicia el contador
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 bg-white/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo Oficial con Acceso Secreto (3 toques) */}
        <div
          onClick={handleSecretLogoTap}
          role="button"
          tabIndex={0}
          aria-label="Castillo's Pizza"
          className="flex cursor-pointer select-none items-center gap-3 group"
        >
          <div className="relative h-14 w-32 sm:h-16 sm:w-36 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <Image
              src="/logo-castillos.png"
              alt="Castillo's Pizza Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <Sparkles className="h-3 w-3 text-amber-600" />
              Sabor de Otro Nivel
            </span>
            <span className="mt-0.5 text-xs font-medium text-gray-500">
              Pedidos en Mesa y Domicilios
            </span>
          </div>
        </div>

        {/* Buscador Instantáneo */}
        <div className="order-3 w-full md:order-2 md:max-w-md lg:max-w-lg">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar pizza, hamburguesa, granizada, ingrediente..."
              className="w-full rounded-full border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-9 text-sm text-gray-800 placeholder-gray-400 transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-400/20"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Acciones Derecha: Estación Cocina/Barra + Carrito */}
        <div className="order-2 flex items-center gap-2.5 sm:gap-3 md:order-3">
          <Link
            href="/cocina-barra"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50"
            title="Ver panel de impresión separada Cocina y Barra"
          >
            <Printer className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Cocina / Barra</span>
          </Link>

          <button
            onClick={onOpenCart}
            className="relative inline-flex items-center gap-2.5 rounded-full bg-[#FACC15] px-4 py-2.5 text-sm font-extrabold text-gray-900 shadow-md shadow-amber-400/25 transition-all hover:bg-amber-400 active:scale-95"
          >
            <ShoppingBag className="h-4 w-4 stroke-[2.5]" />
            <span>{cartCount > 0 ? formatPrice(cartTotal) : 'Tu Pedido'}</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1.5 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
