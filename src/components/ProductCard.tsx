'use client';

import { useState } from 'react';
import { Product } from '@/types/restaurant';
import { Plus, Flame, Wine, ChefHat, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (
    product: Product,
    selectedOption?: string,
    finalPrice?: number,
    notes?: string
  ) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  const hasOptions = Boolean(product.options && product.options.length > 0);
  const currentOption = hasOptions ? product.options![selectedOptionIndex] : undefined;
  const currentPrice = product.price + (currentOption?.priceModifier || 0);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const handleAdd = () => {
    onAddToCart(
      product,
      currentOption?.label,
      currentPrice,
      notes.trim() || undefined
    );
    setNotes('');
    setShowNotes(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10">
      <div>
        {/* Etiquetas superiores: Estación de Impresión + Popular */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
              product.station === 'BARRA'
                ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80'
            }`}
          >
            {product.station === 'BARRA' ? (
              <>
                <Wine className="h-3 w-3 text-sky-600" />
                Barra / Bebidas
              </>
            ) : (
              <>
                <ChefHat className="h-3 w-3 text-amber-600" />
                Cocina
              </>
            )}
          </span>

          {product.popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-orange-700 border border-orange-200/80">
              <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
              Favorito
            </span>
          )}
        </div>

        {/* Nombre y Descripción */}
        <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-amber-700 transition-colors">
          {product.name}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          {product.description}
        </p>

        {/* Selector de Opciones (Proteínas, Sabores, Tamaños) */}
        {hasOptions && product.options && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
              {product.optionsTitle || 'Elige una opción'}
            </label>
            <select
              value={selectedOptionIndex}
              onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2 text-sm font-semibold text-gray-800 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            >
              {product.options.map((opt, index) => (
                <option key={opt.label} value={index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nota opcional para Cocina o Barra */}
        <div className="mt-3">
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-xs font-semibold text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-amber-700"
            >
              + Agregar nota (sin cebolla, poco hielo, etc.)
            </button>
          ) : (
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sin cebolla, bien asada, sin hielo..."
              className="mt-1 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Pie de tarjeta: Precio y Botón Agregar */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <span className="block text-[11px] font-medium text-gray-400">
            Precio
          </span>
          <span className="text-xl font-extrabold text-gray-900">
            {formatPrice(currentPrice)}
          </span>
        </div>

        <button
          onClick={handleAdd}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-sm transition-all active:scale-95 ${
            justAdded
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-[#FACC15] text-gray-900 hover:bg-amber-400 shadow-amber-400/20'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Agregado</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Agregar</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
