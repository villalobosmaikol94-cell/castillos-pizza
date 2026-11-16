'use client';

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Printer, Download, Store } from 'lucide-react';

export default function QrTablesGenerator() {
  const [tableCount, setTableCount] = useState<number>(12);
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const tables = Array.from({ length: Math.max(1, Math.min(50, tableCount)) }, (_, i) => i + 1);

  const handleDownloadQr = (tableNumber: number) => {
    const canvas = document.getElementById(`qr-mesa-${tableNumber}`) as HTMLCanvasElement | null;
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `QR-Mesa-${tableNumber}-CastillosPizza.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrintAllQrs = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Barra de Configuración */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              Generador de Códigos QR por Mesa
            </h2>
            <p className="text-xs text-gray-500">
              Al escanear, el cliente entra directo con su mesa asignada
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2">
            <Store className="h-4 w-4 text-amber-600" />
            <label htmlFor="table-count" className="text-xs font-bold text-gray-700">
              Cantidad de Mesas:
            </label>
            <input
              id="table-count"
              type="number"
              min={1}
              max={50}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value) || 1)}
              className="w-14 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm font-extrabold text-gray-900 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handlePrintAllQrs}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FACC15] px-4 py-2.5 text-xs font-extrabold text-gray-900 shadow-xs hover:bg-amber-400"
          >
            <Printer className="h-4 w-4 stroke-[2.5]" />
            <span>Imprimir Todos los QR</span>
          </button>
        </div>
      </div>

      {/* Cuadrícula de Tarjetas QR */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tables.map((num) => {
          const tableUrl = `${baseUrl}/?mesa=${num}`;

          return (
            <div
              key={num}
              className="flex flex-col items-center justify-between rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-2xs transition-all hover:border-amber-300 break-inside-avoid"
            >
              <div>
                <span className="inline-block rounded-full bg-[#FACC15] px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-gray-900">
                  Castillo&apos;s Pizza
                </span>
                <h3 className="mt-2 text-2xl font-extrabold text-gray-900">
                  MESA {num}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  Escanea para ver el menú y pedir
                </p>
              </div>

              <div className="my-5 rounded-2xl border-2 border-amber-200 bg-white p-3 shadow-2xs">
                {baseUrl && (
                  <QRCodeCanvas
                    id={`qr-mesa-${num}`}
                    value={tableUrl}
                    size={165}
                    level="H"
                    fgColor="#111827"
                    bgColor="#FFFFFF"
                  />
                )}
              </div>

              <button
                onClick={() => handleDownloadQr(num)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:border-amber-400 hover:bg-amber-50 print:hidden"
              >
                <Download className="h-3.5 w-3.5 text-amber-600" />
                <span>Descargar PNG</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
