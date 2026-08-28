import type { Metadata } from 'next';
import './globals.css';
import Logo from './Logo';

export const metadata: Metadata = {
  title: 'Puestico — Viajá compartido en el área metropolitana',
  description:
    'Reservá un puesto en un viaje que ya sale hacia tu destino. Guatire, Caracas, Los Teques y más.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <a href="/" className="logo">
            <Logo size={32} />
            <span className="logo-text">
              Puestico
              <small>tu puesto, tu viaje</small>
            </span>
          </a>
          <span className="badge-demo">
            <span className="dot" />
            Demo
          </span>
        </header>

        <main className="main">{children}</main>

        <footer className="footer">
          <Logo size={18} />
          <span>Puestico · Área metropolitana de Caracas</span>
        </footer>
      </body>
    </html>
  );
}
