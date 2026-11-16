'use client';

import { MenuCategory } from '@/types/restaurant';
import { Utensils, Wine } from 'lucide-react';

interface CategoryBarProps {
  categories: MenuCategory[];
  selectedCategory: MenuCategory | 'Todas';
  onSelectCategory: (category: MenuCategory | 'Todas') => void;
}

export default function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <nav
      aria-label="Categorías del menú"
      className="sticky top-[73px] sm:top-[81px] z-30 w-full border-b border-gray-200/70 bg-white/95 backdrop-blur-md shadow-xs"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Botón Todas */}
          <button
            onClick={() => onSelectCategory('Todas')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              selectedCategory === 'Todas'
                ? 'bg-[#FACC15] text-gray-900 shadow-sm ring-2 ring-amber-400/50'
                : 'bg-gray-100/80 text-gray-600 hover:bg-amber-50 hover:text-gray-900'
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Todo el Menú</span>
          </button>

          {/* Categorías Reales */}
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const isDrink = category === 'Bebidas';

            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#FACC15] text-gray-900 font-bold shadow-sm ring-2 ring-amber-400/50'
                    : isDrink
                    ? 'border border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100'
                    : 'bg-gray-100/80 text-gray-600 hover:bg-amber-50 hover:text-gray-900'
                }`}
              >
                {isDrink && <Wine className="h-3.5 w-3.5 text-sky-600" />}
                <span>{category}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
