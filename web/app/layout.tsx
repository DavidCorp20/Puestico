import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0F1419',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * El armazón es de app, no de sitio web.
 *
 * El teléfono manda: contenido a ancho completo con un tope de 480px
 * centrado (como se ve una app en escritorio), y la navegación abajo,
 * donde llega el pulgar. La cabecera la pone cada pantalla, porque en
 * una app cada vista tiene su propia barra — no una global.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">
          Ir al contenido
        </a>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
