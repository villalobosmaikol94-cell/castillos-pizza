'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Plus,
  Trash2,
  Clock,
  LogIn,
  LogOut,
  Receipt,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  pin_code: string;
  active: boolean;
}

interface AttendanceLog {
  id: string;
  staff_name: string;
  staff_role: string;
  event_type: 'IN' | 'OUT';
  recorded_at: string;
}

interface InvoiceRecord {
  id: string;
  table_number: string;
  waiter_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function StaffAndInvoicesManager() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Mesero');
  const [newPin, setNewPin] = useState('');
  const loadAllData = async () => {
    if (!supabase) return;

    const [staffRes, attRes, invRes] = await Promise.all([
      supabase
        .from('staff_members')
        .select('*')
        .order('name', { ascending: true }),
      supabase
        .from('staff_attendance')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100),
      supabase
        .from('orders')
        .select('*')
        .eq('status', 'ENTREGADO')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    if (!staffRes.error && staffRes.data)
      setStaffList(staffRes.data as StaffMember[]);
    if (!attRes.error && attRes.data)
      setAttendanceLogs(attRes.data as AttendanceLog[]);
    if (!invRes.error && invRes.data)
      setInvoices(invRes.data as InvoiceRecord[]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim() || !supabase) return;

    await supabase.from('staff_members').insert([
      {
        name: newName.trim(),
        role: newRole,
        pin_code: newPin.trim(),
        active: true,
      },
    ]);

    setNewName('');
    setNewPin('');
    loadAllData();
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al trabajador "${name}" del equipo?`) || !supabase)
      return;
    await supabase.from('staff_members').delete().eq('id', id);
    loadAllData();
  };

  const handleDeleteSingleAttendance = async (id: string) => {
    if (!confirm('¿Borrar este registro de asistencia?') || !supabase) return;
    await supabase.from('staff_attendance').delete().eq('id', id);
    loadAllData();
  };

  const handleClearAllAttendance = async () => {
    if (
      !confirm(
        '⚠️ ¿Estás seguro de borrar TODOS los registros de entrada y salida de trabajadores? Esta acción no se puede deshacer.'
      ) ||
      !supabase
    )
      return;

    await supabase
      .from('staff_attendance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    loadAllData();
  };

  const entryLogs = attendanceLogs.filter((log) => log.event_type === 'IN');
  const exitLogs = attendanceLogs.filter((log) => log.event_type === 'OUT');

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('es-CO', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>Control de Ingresos y Salidas de Trabajadores</span>
            </h3>
            <p className="text-xs text-gray-500">
              Auditoría en tiempo real del reloj de asistencia con borrado individual o reinicio semanal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadAllData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-extrabold text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualizar</span>
            </button>

            {attendanceLogs.length > 0 && (
              <button
                onClick={handleClearAllAttendance}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-extrabold text-red-700 hover:bg-red-600 hover:text-white"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Borrar Todo el Historial</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-900">
                <LogIn className="h-4 w-4 text-emerald-600" />
                <span>Ingresos / Entradas ({entryLogs.length})</span>
              </h4>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                TURNO INICIADO
              </span>
            </div>

            {entryLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-emerald-700/70">
                No hay ingresos registrados.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {entryLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-white px-3.5 py-2.5 text-xs shadow-2xs"
                  >
                    <div>
                      <p className="font-extrabold text-gray-900">
                        {log.staff_name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {log.staff_role} •{' '}
                        <strong className="text-emerald-700">
                          {formatDateTime(log.recorded_at)}
                        </strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSingleAttendance(log.id)}
                      className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white"
                      title="Borrar este ingreso"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-amber-900">
                <LogOut className="h-4 w-4 text-amber-600" />
                <span>Salidas de Turno ({exitLogs.length})</span>
              </h4>
              <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                TURNO FINALIZADO
              </span>
            </div>

            {exitLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-amber-800/70">
                No hay salidas registradas.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {exitLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-white px-3.5 py-2.5 text-xs shadow-2xs"
                  >
                    <div>
                      <p className="font-extrabold text-gray-900">
                        {log.staff_name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {log.staff_role} •{' '}
                        <strong className="text-amber-800">
                          {formatDateTime(log.recorded_at)}
                        </strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSingleAttendance(log.id)}
                      className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white"
                      title="Borrar esta salida"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Users className="h-5 w-5 text-amber-500" />
            <span>Equipo de Trabajo y PINs de Acceso ({staffList.length})</span>
          </h3>
          <p className="text-xs text-gray-500">
            Administra los meseros, cocineros y cajeros con su clave personal de
            4 dígitos
          </p>
        </div>

        <form
          onSubmit={handleAddStaff}
          className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4"
        >
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre completo del trabajador"
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-900"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800"
          >
            <option value="Mesero">Cargo: Mesero</option>
            <option value="Cocina / Pizzero">Cargo: Cocina / Pizzero</option>
            <option value="Caja / Barra">Cargo: Caja / Barra</option>
            <option value="Domiciliario">Cargo: Domiciliario</option>
          </select>
          <input
            type="text"
            required
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="PIN (Ej: 1019)"
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-extrabold tracking-widest text-gray-900"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2 text-xs font-extrabold text-gray-900 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Trabajador</span>
          </button>
        </form>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {staffList.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs"
            >
              <div>
                <p className="flex items-center gap-1 font-extrabold text-gray-900">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{member.name}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {member.role} • PIN:{' '}
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono font-extrabold text-gray-800">
                    {member.pin_code}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleDeleteStaff(member.id, member.name)}
                className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-600 hover:text-white"
                title="Eliminar trabajador"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <Receipt className="h-5 w-5 text-amber-500" />
            <span>Historial Reciente de Facturas Cerradas ({invoices.length})</span>
          </h3>
        </div>

        {invoices.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-400">
            Aún no hay facturas cerradas registradas.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 text-xs"
              >
                <div>
                  <span className="rounded-lg bg-gray-900 px-2.5 py-1 font-extrabold text-[#FACC15]">
                    {inv.table_number}
                  </span>
                  <span className="ml-2.5 font-extrabold text-gray-900">
                    Atendió: {inv.waiter_name || 'Sin asignar'}
                  </span>
                  <span className="ml-2 text-gray-400">
                    • {formatDateTime(inv.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                    {inv.payment_method || 'Efectivo'}
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatPrice(Number(inv.total_amount || 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
