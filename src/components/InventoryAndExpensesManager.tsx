'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Plus,
  AlertTriangle,
  Truck,
  Wallet,
  TrendingDown,
  Trash2,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  supplier_name: string;
}

interface ExpenseRecord {
  id: string;
  concept: string;
  expense_type: 'LOCAL' | 'EMPLEADOS' | 'PROVEEDORES';
  amount: number;
  notes: string;
  created_at: string;
}

export default function InventoryAndExpensesManager() {
  const [subTab, setSubTab] = useState<'INVENTARIO' | 'GASTOS'>('INVENTARIO');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  // Formulario nuevo insumo
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Gaseosas');
  const [itemUnit, setItemUnit] = useState('Unidades');
  const [itemStock, setItemStock] = useState('');
  const [itemMinStock, setItemMinStock] = useState('5');
  const [itemCost, setItemCost] = useState('');
  const [itemSupplier, setItemSupplier] = useState('');

  // Formulario nuevo gasto
  const [expConcept, setExpConcept] = useState('');
  const [expType, setExpType] = useState<'LOCAL' | 'EMPLEADOS' | 'PROVEEDORES'>('LOCAL');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');

  const loadData = async () => {
    if (!supabase) return;
    const [invRes, expRes] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name', { ascending: true }),
      supabase.from('restaurant_expenses').select('*').order('created_at', { ascending: false }),
    ]);

    if (!invRes.error && invRes.data) setItems(invRes.data as InventoryItem[]);
    if (!expRes.error && expRes.data) setExpenses(expRes.data as ExpenseRecord[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !supabase) return;

    await supabase.from('inventory_items').insert([
      {
        name: itemName.trim(),
        category: itemCategory,
        unit: itemUnit,
        current_stock: Number(itemStock || 0),
        min_stock: Number(itemMinStock || 5),
        unit_cost: Number(itemCost || 0),
        supplier_name: itemSupplier.trim() || 'Proveedor General',
      },
    ]);

    setItemName('');
    setItemStock('');
    setItemCost('');
    setItemSupplier('');
    loadData();
  };

  const handleAdjustStock = async (id: string, current: number, delta: number) => {
    const updatedStock = Math.max(0, Number(current) + delta);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, current_stock: updatedStock } : it))
    );
    if (supabase) {
      await supabase
        .from('inventory_items')
        .update({ current_stock: updatedStock })
        .eq('id', id);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expConcept.trim() || !expAmount || !supabase) return;

    await supabase.from('restaurant_expenses').insert([
      {
        concept: expConcept.trim(),
        expense_type: expType,
        amount: Number(expAmount),
        notes: expNotes.trim(),
      },
    ]);

    setExpConcept('');
    setExpAmount('');
    setExpNotes('');
    loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este registro de gasto?') || !supabase) return;
    await supabase.from('restaurant_expenses').delete().eq('id', id);
    loadData();
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  const totalInventoryValue = items.reduce(
    (acc, it) => acc + Number(it.current_stock) * Number(it.unit_cost),
    0
  );
  const totalExpenses = expenses.reduce((acc, ex) => acc + Number(ex.amount), 0);
  return (
    <div className="space-y-6">
      {/* Selector Inventario vs Gastos */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('INVENTARIO')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
              subTab === 'INVENTARIO'
                ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Inventario y Proveedores ({items.length})</span>
          </button>

          <button
            onClick={() => setSubTab('GASTOS')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
              subTab === 'GASTOS'
                ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Gastos Local, Empleados y Proveedores</span>
          </button>
        </div>

        <div className="text-right">
          <span className="block text-[11px] font-bold uppercase text-gray-400">
            {subTab === 'INVENTARIO' ? 'Capital en Inventario' : 'Total Gastos Registrados'}
          </span>
          <span className="text-lg font-extrabold text-gray-900">
            {formatPrice(subTab === 'INVENTARIO' ? totalInventoryValue : totalExpenses)}
          </span>
        </div>
      </div>

      {subTab === 'INVENTARIO' ? (
        <>
          <form
            onSubmit={handleAddItem}
            className="grid grid-cols-1 gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs sm:grid-cols-2 lg:grid-cols-6"
          >
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Producto (Ej: Coca-Cola 400ml, Pechuga)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 lg:col-span-2"
            />
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="Gaseosas">Gaseosas y Bebidas</option>
              <option value="Proteinas">Proteínas / Carnes</option>
              <option value="Arroz y Pastas">Arroz y Pastas</option>
              <option value="Insumos">Insumos / Quesos / Harina</option>
            </select>
            <input
              type="number"
              required
              value={itemStock}
              onChange={(e) => setItemStock(e.target.value)}
              placeholder="Stock Inicial"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900"
            />
            <input
              type="number"
              required
              value={itemCost}
              onChange={(e) => setItemCost(e.target.value)}
              placeholder="Costo Unitario ($)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Stock</span>
            </button>
            <input
              type="text"
              value={itemSupplier}
              onChange={(e) => setItemSupplier(e.target.value)}
              placeholder="Nombre del Proveedor (Opcional)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 sm:col-span-2"
            />
            <select
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700"
            >
              <option value="Unidades">Unidades</option>
              <option value="Kg">Kilogramos (Kg)</option>
              <option value="Litros">Litros</option>
              <option value="Bultos">Bultos / Cajas</option>
            </select>
            <input
              type="number"
              value={itemMinStock}
              onChange={(e) => setItemMinStock(e.target.value)}
              placeholder="Alerta Mínima (5)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800"
            />
          </form>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 font-extrabold uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Insumo / Producto</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3">Proveedor</th>
                    <th className="px-5 py-3">Costo Unit.</th>
                    <th className="px-5 py-3 text-center">Stock Actual</th>
                    <th className="px-5 py-3 text-right">Ajustar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => {
                    const isLow = Number(it.current_stock) <= Number(it.min_stock);
                    return (
                      <tr key={it.id} className={isLow ? 'bg-red-50/40' : ''}>
                        <td className="px-5 py-3.5 font-extrabold text-gray-900">
                          {it.name}
                          {isLow && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Stock Bajo
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{it.category}</td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 text-amber-600" />
                            {it.supplier_name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-gray-800">
                          {formatPrice(Number(it.unit_cost))}
                        </td>
                        <td className="px-5 py-3.5 text-center font-extrabold text-gray-900">
                          {it.current_stock} {it.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleAdjustStock(it.id, it.current_stock, -1)}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-extrabold text-gray-700 hover:bg-gray-100"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleAdjustStock(it.id, it.current_stock, 1)}
                              className="rounded-lg bg-emerald-500 px-2.5 py-1 font-extrabold text-white hover:bg-emerald-600"
                            >
                              +1
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Formulario Registrar Gasto */}
          <form
            onSubmit={handleAddExpense}
            className="grid grid-cols-1 gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs sm:grid-cols-4"
          >
            <input
              type="text"
              required
              value={expConcept}
              onChange={(e) => setExpConcept(e.target.value)}
              placeholder="Concepto (Ej: Pago turno, Factura Gas, Compra Carnes)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-900"
            />
            <select
              value={expType}
              onChange={(e) =>
                setExpType(e.target.value as 'LOCAL' | 'EMPLEADOS' | 'PROVEEDORES')
              }
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800"
            >
              <option value="LOCAL">Gasto del Local (Arriendo / Servicios)</option>
              <option value="EMPLEADOS">Gasto de Empleados / Nómina</option>
              <option value="PROVEEDORES">Pago a Proveedores</option>
            </select>
            <input
              type="number"
              required
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="Valor del Gasto ($ COP)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-900"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-extrabold text-[#FACC15] hover:bg-gray-800"
            >
              <TrendingDown className="h-4 w-4" />
              <span>Registrar Egreso</span>
            </button>
          </form>

          {/* Lista de Gastos */}
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
            <div className="divide-y divide-gray-100">
              {expenses.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-6 py-4 text-xs"
                >
                  <div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-extrabold text-gray-700">
                      {ex.expense_type}
                    </span>
                    <span className="ml-2.5 text-sm font-extrabold text-gray-900">
                      {ex.concept}
                    </span>
                    <span className="ml-2 text-gray-400">
                      {new Date(ex.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-red-600">
                      -{formatPrice(Number(ex.amount))}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(ex.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
