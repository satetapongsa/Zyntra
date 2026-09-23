import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://zyntrazy.vercel.app';

export const metadata: Metadata = {
  title: 'Zyntra — Intelligent AI Workspace',
  description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Zyntra — Intelligent AI Workspace',
    description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
    url: siteUrl,
    siteName: 'Zyntra',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        secureUrl: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Zyntra AI Workspace Preview',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zyntra — Intelligent AI Workspace',
    description: 'An enterprise-grade, privacy-first AI workspace powered by Zyntra v5.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  icons: {
    icon: '/og-image.jpg',
    shortcut: '/og-image.jpg',
    apple: '/og-image.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta property="og:image" content="https://zyntrazy.vercel.app/og-image.jpg" />
        <meta property="og:image:secure_url" content="https://zyntrazy.vercel.app/og-image.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:image" content="https://zyntrazy.vercel.app/og-image.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
