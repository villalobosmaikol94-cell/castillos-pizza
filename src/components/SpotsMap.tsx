'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RestaurantSpot } from '@/types/restaurant';
import { Armchair, CheckCircle2, Clock, Users } from 'lucide-react';

interface SpotsMapProps {
  onSelectSpotForOrder?: (spotLabel: string) => void;
}

export default function SpotsMap({ onSelectSpotForOrder }: SpotsMapProps) {
  const [spots, setSpots] = useState<RestaurantSpot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpots = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('restaurant_spots')
      .select('*')
      .order('spot_number', { ascending: true });

    if (!error && data) {
      setSpots(data as RestaurantSpot[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSpots();

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('realtime-restaurant-spots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_spots' },
        () => {
          loadSpots();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  const cycleSpotStatus = async (spot: RestaurantSpot) => {
    const nextStatus: RestaurantSpot['status'] =
      spot.status === 'DISPONIBLE'
        ? 'OCUPADA'
        : spot.status === 'OCUPADA'
        ? 'RESERVADA'
        : 'DISPONIBLE';

    setSpots((prev) =>
      prev.map((s) => (s.id === spot.id ? { ...s, status: nextStatus } : s))
    );

    if (supabase) {
      await supabase
        .from('restaurant_spots')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', spot.id);
    }
  };

  const tables = spots.filter((s) => s.spot_type === 'MESA');
  const barChairs = spots.filter((s) => s.spot_type === 'BARRA');

  const getStatusStyle = (status: RestaurantSpot['status']) => {
    if (status === 'OCUPADA') {
      return {
        card: 'border-red-300 bg-red-50/90 text-red-900',
        badge: 'bg-red-600 text-white',
        label: 'Ocupada',
      };
    }
    if (status === 'RESERVADA') {
      return {
        card: 'border-amber-300 bg-amber-50/90 text-amber-900',
        badge: 'bg-amber-500 text-white',
        label: 'Reservada',
      };
    }
    return {
      card: 'border-emerald-200 bg-white text-gray-900 hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800',
      label: 'Disponible',
    };
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-400">
        Cargando mapa de 36 mesas y barra...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Leyenda Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">
            Mapa de Salón en Vivo (36 Mesas + 7 Sillas de Barra)
          </h2>
          <p className="text-xs text-gray-500">
            Haz clic en cualquier mesa o silla para alternar: Disponible → Ocupada → Reservada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Disponibles ({spots.filter((s) => s.status === 'DISPONIBLE').length})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700 border border-red-200">
            <Users className="h-3.5 w-3.5" />
            Ocupadas ({spots.filter((s) => s.status === 'OCUPADA').length})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            Reservadas ({spots.filter((s) => s.status === 'RESERVADA').length})
          </span>
        </div>
      </div>

      {/* Zona de Barra: 7 Sillas */}
      <section className="rounded-3xl border border-sky-200/80 bg-sky-50/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Armchair className="h-5 w-5 text-sky-700" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-sky-900">
            Zona de Barra (7 Sillas)
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {barChairs.map((chair) => {
            const style = getStatusStyle(chair.status);
            return (
              <div
                key={chair.id}
                onClick={() => cycleSpotStatus(chair)}
                className={`cursor-pointer select-none rounded-2xl border-2 p-3.5 text-center shadow-2xs transition-all active:scale-95 ${style.card}`}
              >
                <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100/80 text-sky-800">
                  <Armchair className="h-5 w-5" />
                </div>
                <div className="text-sm font-extrabold">
                  Barra {chair.spot_number}
                </div>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${style.badge}`}
                >
                  {style.label}
                </span>
                {onSelectSpotForOrder && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSpotForOrder(`Barra ${chair.spot_number}`);
                    }}
                    className="mt-2 block w-full rounded-lg bg-gray-900 py-1 text-[10px] font-bold text-white hover:bg-gray-700"
                  >
                    Tomar Pedido
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Zona Principal: 36 Mesas */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs">
        <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-gray-800">
          Salón Principal (Mesas 1 a 36)
        </h3>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
          {tables.map((table) => {
            const style = getStatusStyle(table.status);
            return (
              <div
                key={table.id}
                onClick={() => cycleSpotStatus(table)}
                className={`cursor-pointer select-none rounded-2xl border-2 p-4 text-center shadow-2xs transition-all active:scale-95 ${style.card}`}
              >
                {/* Representación Visual de Mesa con 4 Sillas */}
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-current/20 bg-white/70 font-extrabold text-base">
                  M{table.spot_number}
                </div>
                <div className="text-sm font-extrabold">
                  Mesa {table.spot_number}
                </div>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${style.badge}`}
                >
                  {style.label}
                </span>
                {onSelectSpotForOrder && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSpotForOrder(`Mesa ${table.spot_number}`);
                    }}
                    className="mt-2.5 block w-full rounded-lg bg-[#FACC15] py-1 text-[11px] font-extrabold text-gray-900 hover:bg-amber-400"
                  >
                    + Pedido
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
