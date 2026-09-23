import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zyntra — Intelligent AI Workspace',
  description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Zyntra — Intelligent AI Workspace',
    description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
    url: '/',
    siteName: 'Zyntra',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Zyntra AI Workspace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zyntra — Intelligent AI Workspace',
    description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/og-image.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
