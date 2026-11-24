export type PrintStation = 'COCINA' | 'BARRA';

export type MenuCategory =
  | 'Almuerzo Corriente'
  | 'Pizza'
  | 'Pizzetas'
  | 'Panzerotti'
  | 'Hamburguesas'
  | 'Perros'
  | 'Carnes y Alitas'
  | 'Pescados'
  | 'Pasta y Arroz'
  | 'Desgranados'
  | 'Papas'
  | 'Shawarma'
  | 'Adicionales'
  | 'Bebidas';

export interface ProductOption {
  label: string;
  priceModifier?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  station: PrintStation;
  popular?: boolean;
  available?: boolean;
  imageUrl?: string;
  optionsTitle?: string;
  options?: ProductOption[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedOption?: string;
  finalPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  orderType: 'MESA' | 'DOMICILIO';
  tableOrAddress: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  status: 'PENDIENTE' | 'PREPARANDO' | 'LISTO';
  waiterName?: string;
  waiterCode?: string;
  kitchenStatus?: 'EN_COLA' | 'PREPARANDO' | 'DESPACHADO';
  isCancelled?: boolean;
  cancelReason?: string;
  invoiceType?: 'POS_LOCAL' | 'DIAN_ELECTRONICA';
}

export interface RestaurantSpot {
  id: string;
  spot_type: 'MESA' | 'BARRA';
  spot_number: number;
  floor?: 'PISO_1' | 'PISO_2' | 'PISO_3';
  status: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA';
}

export interface WaiterProfile {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

