import type { Metadata, Viewport } from 'next';
import './globals.css';
import Logo from './Logo';

export const metadata: Metadata = {
  title: 'Puestico — Alguien ya va para allá. Móntate.',
  description:
    'Reserva tu puesto en un carro que ya sale hacia tu destino. Pagas menos, llegas igual. Guatire, Guarenas, Caracas, Los Teques y el litoral.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0F1419',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">
          Ir al contenido
        </a>

        <header className="header">
          <a href="/" className="logo">
            <Logo size={32} />
            <span className="logo-text">
              Puestico
              <small>tu puesto, tu viaje</small>
            </span>
          </a>
          <div className="header-right">
            <a className="header-link" href="/inicio">
              La propuesta
            </a>
            <a className="header-link" href="/metricas">
              Métricas
            </a>
            <span className="badge-demo">
              <span className="dot" />
              Modo demo
            </span>
          </div>
        </header>

        <main className="main" id="contenido">
          {children}
        </main>

        <footer className="footer">
          <Logo size={18} />
          <span>Puestico · Área metropolitana de Caracas</span>
        </footer>
      </body>
    </html>
  );
}
