import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlayMyAdz | Mobile LED Advertising',
  description:
    'Book mobile LED advertising trucks across Hyderabad with route planning, creative management, GPS tracking, and campaign reporting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/site/styles.css?v=10" />
      </head>
      <body>
        {children}
        <Script src="/site/script.js?v=10" strategy="afterInteractive" />
      </body>
    </html>
  );
}
