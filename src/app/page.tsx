'use client';

import { useState, useMemo, useEffect } from 'react';
import { MENU_CATEGORIES, MENU_PRODUCTS } from '@/data/menuData';
import { getStoredMenu } from '@/lib/menuStorage';
import { supabase } from '@/lib/supabase';

import { CartItem, MenuCategory, Product } from '@/types/restaurant';
import Navbar from '@/components/Navbar';
import CategoryBar from '@/components/CategoryBar';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import { Sparkles, Flame, SearchX } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(MENU_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'Todas'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

   useEffect(() => {
    const stored = getStoredMenu();
    if (stored && stored.length > 0) {
      setProducts(stored);
    }

    const fetchCloudMenu = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('menu_items')
        .select('*');

      if (!error && data && data.length > 0) {
        const mapped: Product[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          name: String(row.name),
          description: String(row.description || ''),
          price: Number(row.price ?? row.base_price ?? 0),
          category: row.category as MenuCategory,
          station: (row.station as 'COCINA' | 'BARRA') || 'COCINA',
          popular: Boolean(row.popular),
          available: row.available !== false,
          imageUrl: row.image_url ? String(row.image_url) : undefined,
          optionsTitle: row.options_title
            ? String(row.options_title)
            : undefined,
          options: (row.options as Product['options']) || undefined,
        }));
        setProducts(mapped);
      }
    };

    fetchCloudMenu();

    const handleUpdate = () => {
      const updated = getStoredMenu();
      if (updated && updated.length > 0) {
        setProducts(updated);
      }
      fetchCloudMenu();
    };

    window.addEventListener('castillos_menu_updated', handleUpdate);
    return () => window.removeEventListener('castillos_menu_updated', handleUpdate);
  }, []);


  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (product.available === false) return false;

      const matchesCategory =
        selectedCategory === 'Todas' || product.category === selectedCategory;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleAddToCart = (
    product: Product,
    selectedOption?: string,
    finalPrice?: number,
    notes?: string
  ) => {
    const unitPrice = finalPrice ?? product.price;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === product.id &&
          item.selectedOption === selectedOption &&
          item.notes === notes
      );

      if (existingIndex > -1) {
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
          selectedOption,
          finalPrice: unitPrice,
          notes,
        },
      ];
    });
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item, idx) =>
          idx === index ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.finalPrice * item.quantity,
    0
  );
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Cabecera Luminosa con Logo Oficial (3 toques para Admin) */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Barra Deslizante de Categorías */}
      <CategoryBar
        categories={MENU_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Hero Editorial Luminoso */}
      <section className="border-b border-gray-200/60 bg-gradient-to-b from-amber-50/80 via-white to-[#FAFAFA] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-amber-700 shadow-xs border border-amber-200/80">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Carta Oficial Castillo&apos;s Pizza</span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                Elige tu antojo favorito al instante
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-gray-500">
                Almuerzos corrientes, pizzas, pizzetas, hamburguesas artesanales,
                carnes, pescados y bebidas refrescantes.
              </p>
            </div>

            {selectedCategory !== 'Todas' && (
              <button
                onClick={() => setSelectedCategory('Todas')}
                className="self-start md:self-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:border-amber-400 hover:bg-amber-50"
              >
                Ver todas las categorías (
                {products.filter((p) => p.available !== false).length} platos)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Catálogo de Productos */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
            <Flame className="h-5 w-5 text-amber-500" />
            <span>
              {selectedCategory === 'Todas'
                ? 'Todo Nuestro Menú'
                : selectedCategory}
            </span>
          </h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 border border-gray-200/80">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'opción' : 'opciones'}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <SearchX className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-extrabold text-gray-800">
              No encontramos platos con &quot;{searchQuery}&quot;
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Intenta buscar otro ingrediente o limpia el filtro.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              className="mt-4 rounded-full bg-[#FACC15] px-5 py-2.5 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
            >
              Mostrar todo el menú
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* Carrito Lateral Inteligente */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
