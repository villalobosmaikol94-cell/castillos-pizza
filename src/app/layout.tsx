import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: "Castillo's Pizza | Menú Digital y Pedidos en Línea",
  description:
    'Pizzas artesanales, hamburguesas, carnes a la parrilla, almuerzos corrientes y mucho más. Pide fácil y rápido.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${jakarta.className} bg-[#FAFAFA] text-[#1F2937] antialiased selection:bg-[#FACC15] selection:text-[#1F2937]`}
      >
        {children}
      </body>
    </html>
  );
}
