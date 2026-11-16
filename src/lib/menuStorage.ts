import { MENU_PRODUCTS } from '@/data/menuData';
import { Product } from '@/types/restaurant';

const STORAGE_KEY = 'castillos_custom_menu_v1';

// Obtiene el menú actualizado (si el admin editó precios o disponibilidad, usa esos cambios)
export function getStoredMenu(): Product[] {
  if (typeof window === 'undefined') return MENU_PRODUCTS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initial = MENU_PRODUCTS.map((p) => ({ ...p, available: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(saved);
  } catch {
    return MENU_PRODUCTS;
  }
}

// Guarda cambios del administrador
export function saveStoredMenu(products: Product[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  window.dispatchEvent(new Event('castillos_menu_updated'));
}

// Restaura el menú original de fábrica
export function resetStoredMenu(): Product[] {
  const initial = MENU_PRODUCTS.map((p) => ({ ...p, available: true }));
  saveStoredMenu(initial);
  return initial;
}
