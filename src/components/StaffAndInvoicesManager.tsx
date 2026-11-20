'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WaiterProfile } from '@/types/restaurant';
import {
  Users,
  Clock,
  Ban,
  Plus,
  Pencil,
  Check,
  X,
  UserCheck,
  UserX,
  Trophy,
  AlertTriangle,
} from 'lucide-react';

interface OrderSummary {
  id: string;
  customer_name: string;
  order_type: string;
  table_or_address: string;
  total: number;
  waiter_name: string;
  waiter_code: string | null;
  is_cancelled: boolean;
  cancel_reason: string | null;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  staff_name: string;
  staff_code: string;
  event_type: 'ENTRADA' | 'SALIDA';
  recorded_at: string;
}

export default function StaffAndInvoicesManager() {
  const [subTab, setSubTab] = useState<'MESEROS' | 'ASISTENCIA' | 'FACTURAS'>('MESEROS');
  const [waiters, setWaiters] = useState<WaiterProfile[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Agregar nuevo trabajador
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  // Editar trabajador existente
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const loadAllData = async () => {
    if (!supabase) return;

    const [waitersRes, ordersRes, attRes] = await Promise.all([
      supabase.from('waiters').select('*').order('code', { ascending: true }),
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('staff_attendance')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(60),
    ]);

    if (!waitersRes.error && waitersRes.data) {
      setWaiters(waitersRes.data as WaiterProfile[]);
    }
    if (!ordersRes.error && ordersRes.data) {
      setOrders(ordersRes.data as OrderSummary[]);
    }
    if (!attRes.error && attRes.data) {
      setAttendance(attRes.data as AttendanceRecord[]);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !supabase) return;

    const { error } = await supabase.from('waiters').insert([
      {
        code: newCode.trim(),
        name: newName.trim().toUpperCase(),
        active: true,
      },
    ]);

    if (error) {
      alert('Ese código ya está asignado a otro trabajador.');
      return;
    }

    setNewCode('');
    setNewName('');
    loadAllData();
  };

  const handleSaveWorkerEdit = async (id: number) => {
    if (!editName.trim() || !editCode.trim() || !supabase) return;

    await supabase
      .from('waiters')
      .update({
        name: editName.trim().toUpperCase(),
        code: editCode.trim(),
      })
      .eq('id', id);

    setEditingId(null);
    loadAllData();
  };

  const handleToggleWorkerActive = async (worker: WaiterProfile) => {
    if (!supabase) return;
    await supabase
      .from('waiters')
      .update({ active: !worker.active })
      .eq('id', worker.id);
    loadAllData();
  };

  const handleCancelInvoice = async (order: OrderSummary) => {
    const reason = prompt(
      `¿Cuál es el motivo para ANULAR la factura #${order.id} por ${formatPrice(
        Number(order.total)
      )}?\n(Este valor se descontará automáticamente de caja)`
    );
    if (!reason || !reason.trim() || !supabase) return;

    await supabase
      .from('orders')
      .update({
        is_cancelled: true,
        cancel_reason: reason.trim(),
      })
      .eq('id', order.id);

    loadAllData();
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  // Calcular rendimiento real por mesero (solo órdenes activas no anuladas)
  const validOrders = orders.filter((o) => !o.is_cancelled);
  const getWaiterStats = (code: string) => {
    const myOrders = validOrders.filter((o) => o.waiter_code === code);
    const totalSold = myOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    return {
      count: myOrders.length,
      totalSold,
    };
  };
  return (
    <div className="space-y-6">
      {/* Navegación Interna Exclusiva Admin */}
      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs">
        <button
          onClick={() => setSubTab('MESEROS')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            subTab === 'MESEROS'
              ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>18 Meseros y Rendimiento ({waiters.length})</span>
        </button>

        <button
          onClick={() => setSubTab('ASISTENCIA')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            subTab === 'ASISTENCIA'
              ? 'bg-[#FACC15] text-gray-900 shadow-2xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Asistencia Entrada / Salida</span>
        </button>

        <button
          onClick={() => setSubTab('FACTURAS')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            subTab === 'FACTURAS'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Ban className="h-4 w-4" />
          <span>Anular Facturas</span>
        </button>
      </div>

      {/* SUB-PESTAÑA 1: GESTIÓN Y RENDIMIENTO DE MESEROS */}
      {subTab === 'MESEROS' && (
        <div className="space-y-6">
          {/* Formulario Agregar Nuevo Trabajador */}
          <form
            onSubmit={handleAddWorker}
            className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-gray-900">
                Agregar Nuevo Mesero / Trabajador
              </h3>
              <p className="text-xs text-gray-500">
                Solo el administrador puede crear, editar o retirar personal
              </p>
            </div>

            <input
              type="text"
              required
              maxLength={6}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Código (Ej: 119)"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-extrabold text-gray-900 sm:w-36"
            />
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del Trabajador"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-extrabold uppercase text-gray-900 sm:w-56"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2.5 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Trabajador</span>
            </button>
          </form>

          {/* Cuadrícula de Perfiles de Meseros y Rendimiento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {waiters.map((worker) => {
              const stats = getWaiterStats(worker.code);
              const isEditing = editingId === worker.id;

              return (
                <div
                  key={worker.id}
                  className={`flex flex-col justify-between rounded-3xl border p-5 transition-all ${
                    worker.active
                      ? 'border-gray-200 bg-white shadow-2xs'
                      : 'border-gray-200 bg-gray-100/80 opacity-65'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
                        Código #{worker.code}
                      </span>

                      <button
                        onClick={() => handleToggleWorkerActive(worker)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          worker.active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {worker.active ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            <span>Retirado</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-amber-400 bg-amber-50/40 px-3 py-1.5 text-sm font-extrabold uppercase text-gray-900"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-24 rounded-xl border border-amber-400 bg-amber-50/40 px-3 py-1.5 text-xs font-extrabold text-gray-900"
                          />
                          <button
                            onClick={() => handleSaveWorkerEdit(worker.id)}
                            className="rounded-xl bg-emerald-500 p-2 text-white hover:bg-emerald-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xl bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between">
                        <h3 className="text-lg font-extrabold text-gray-900">
                          {worker.name}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingId(worker.id);
                            setEditName(worker.name);
                            setEditCode(worker.code);
                          }}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-600 hover:border-amber-400 hover:bg-amber-50"
                          title="Editar nombre o código"
                        >
                          <Pencil className="h-3.5 w-3.5 text-amber-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta de Rendimiento de Ventas */}
                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-bold text-gray-500">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        Pedidos Atendidos:
                      </span>
                      <span className="font-extrabold text-gray-900">
                        {stats.count} órdenes
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-500">
                        Total Vendido:
                      </span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatPrice(stats.totalSold)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* SUB-PESTAÑA 2: HISTORIAL DE ASISTENCIA (ENTRADA Y SALIDA) */}
      {subTab === 'ASISTENCIA' && (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-extrabold text-gray-900">
              Registro Consolidado de Entradas y Salidas del Personal
            </h3>
            <p className="text-xs text-gray-500">
              Marcaciones enviadas en tiempo real desde la pantalla /asistencia
            </p>
          </div>

          {attendance.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400">
              Aún no hay registros de entrada o salida.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 font-extrabold uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Trabajador</th>
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Evento</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3 text-right">Hora Exacta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.map((rec) => {
                    const dateObj = new Date(rec.recorded_at);
                    return (
                      <tr key={rec.id}>
                        <td className="px-6 py-3.5 font-extrabold text-gray-900">
                          {rec.staff_name}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-gray-500">
                          #{rec.staff_code}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                              rec.event_type === 'ENTRADA'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {rec.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {dateObj.toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">
                          {dateObj.toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-PESTAÑA 3: ANULACIÓN DE FACTURAS (SOLO ADMIN) */}
      {subTab === 'FACTURAS' && (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
          <div className="border-b border-gray-100 bg-red-50/40 px-6 py-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Control y Anulación de Facturas / Órdenes</span>
            </h3>
            <p className="mt-0.5 text-xs text-gray-600">
              Al anular una factura equivocada, su valor se descuenta automáticamente de la caja y contabilidad.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs ${
                  ord.is_cancelled ? 'bg-red-50/30 opacity-75' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900">
                      #{ord.id}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-bold text-gray-700">
                      {ord.order_type}: {ord.table_or_address}
                    </span>
                    <span className="text-gray-500">
                      Mesero: <strong>{ord.waiter_name || 'QR'}</strong>
                    </span>
                  </div>
                  <p className="mt-1 text-gray-500">
                    Cliente: {ord.customer_name} •{' '}
                    {new Date(ord.created_at).toLocaleString('es-CO')}
                  </p>
                  {ord.is_cancelled && ord.cancel_reason && (
                    <p className="mt-1 font-bold text-red-600">
                      Motivo anulación: {ord.cancel_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-extrabold ${
                      ord.is_cancelled
                        ? 'line-through text-red-500'
                        : 'text-gray-900'
                    }`}
                  >
                    {formatPrice(Number(ord.total))}
                  </span>

                  {ord.is_cancelled ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-extrabold text-red-700">
                      ANULADA
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCancelInvoice(ord)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-600 hover:text-white"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Anular Factura</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
