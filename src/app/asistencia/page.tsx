'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { WaiterProfile } from '@/types/restaurant';
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';

interface AttendanceLog {
  id: string;
  staff_name: string;
  staff_code: string;
  event_type: 'ENTRADA' | 'SALIDA';
  recorded_at: string;
}

export default function AsistenciaPage() {
  const [staffCode, setStaffCode] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayLogs = async () => {
    if (!supabase) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .gte('recorded_at', startOfDay.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTodayLogs(data as AttendanceLog[]);
    }
  };

  useEffect(() => {
    loadTodayLogs();
  }, []);

  const handleMarkAttendance = async (eventType: 'ENTRADA' | 'SALIDA') => {
    const cleanCode = staffCode.trim();
    if (!cleanCode) {
      setFeedback({
        type: 'error',
        message: 'Por favor digita tu código de trabajador.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (!supabase) {
        setFeedback({
          type: 'error',
          message: 'No hay conexión con la base de datos.',
        });
        return;
      }

      const { data: worker, error: workerError } = await supabase
        .from('waiters')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .single();

      if (workerError || !worker) {
        setFeedback({
          type: 'error',
          message: `El código "${cleanCode}" no existe o está inactivo.`,
        });
        setIsSubmitting(false);
        return;
      }

      const profile = worker as WaiterProfile;

      const { error: insertError } = await supabase
        .from('staff_attendance')
        .insert([
          {
            staff_name: profile.name,
            staff_code: profile.code,
            event_type: eventType,
          },
        ]);

      if (insertError) throw insertError;

      setFeedback({
        type: 'success',
        message: `${eventType} registrada para ${profile.name} (#${profile.code}) a las ${currentTime}`,
      });
      setStaffCode('');
      loadTodayLogs();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Ocurrió un error al guardar el registro. Intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex flex-col">
      {/* Cabecera Luminosa */}
      <header className="border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-amber-400 hover:bg-amber-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a la Tienda</span>
          </Link>

          <div className="relative h-10 w-24">
            <Image
              src="/logo-castillos.png"
              alt="Castillo's Pizza"
              fill
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-extrabold text-amber-900">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>{currentTime || '--:--:--'}</span>
          </div>
        </div>
      </header>

      {/* Terminal de Marcación */}
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <UserCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Control de Entrada y Salida de Personal
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Digita tu código personal (101 - 118) y selecciona tu turno
          </p>

          <div className="mx-auto mt-6 max-w-xs">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              placeholder="Código"
              className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-4 text-center text-3xl font-extrabold tracking-[0.3em] text-gray-900 focus:border-amber-400 focus:bg-white focus:outline-none"
              autoFocus
            />
          </div>

          {feedback && (
            <div
              className={`mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-2xl p-3.5 text-xs font-extrabold ${
                feedback.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleMarkAttendance('ENTRADA')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
            >
              <LogIn className="h-5 w-5" />
              <span>Marcar Entrada</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleMarkAttendance('SALIDA')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-[#FACC15] shadow-sm transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Marcar Salida</span>
            </button>
          </div>
        </div>

        {/* Registros del Día */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-extrabold text-gray-900">
              Registros de Hoy en Turno
            </h2>
          </div>

          {todayLogs.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400">
              Aún no hay marcaciones registradas hoy.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-6 py-3.5 text-sm"
                >
                  <div>
                    <span className="font-extrabold text-gray-900">
                      {log.staff_name}
                    </span>
                    <span className="ml-2 text-xs font-semibold text-gray-400">
                      #{log.staff_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        log.event_type === 'ENTRADA'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {log.event_type}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {new Date(log.recorded_at).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
