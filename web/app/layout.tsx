import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Puestico — Viajá compartido Guatire ↔ Caracas',
  description: 'Reservá un puesto en un viaje que ya sale hacia tu destino.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <a href="/" className="logo">
            <span className="logo-mark">🚗</span>
            <span>Puestico</span>
          </a>
          <span className="badge-demo">Demo — datos de prueba</span>
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          Puestico · MVP-0 · Corredor Guatire ↔ Caracas
        </footer>
      </body>
    </html>
  );
}
