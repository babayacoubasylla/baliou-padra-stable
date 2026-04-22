import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FloatingAI from "@/components/FloatingAI";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: "#146332",
};

export const metadata: Metadata = {
  title: {
    default: "BALIOU PADRA - Communauté Cheikh Yacouba Sylla",
    template: "%s | BALIOU PADRA"
  },
  description: "Plateforme Numérique de la Communauté Cheikh Yacouba Sylla - Fondation spirituelle et culturelle à Gagnoa, Côte d'Ivoire",
  manifest: "/manifest.json",
  applicationName: "Baliou Padra",
  keywords: [
    "Baliou Padra",
    "Cheikh Yacouba Sylla",
    "Fondation Yacouba Sylla",
    "Communauté musulmane",
    "Gagnoa",
    "Côte d'Ivoire",
    "Zikhr",
    "Haradat",
    "Spiritualité"
  ],
  authors: [{ name: "Baliou Padra Community", url: "https://balioupadra.org" }],
  creator: "Baliou Padra Foundation",
  publisher: "Baliou Padra Foundation",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baliou Padra",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
  openGraph: {
    title: "BALIOU PADRA - Communauté Cheikh Yacouba Sylla",
    description: "Plateforme Numérique de la Communauté Cheikh Yacouba Sylla - Fondation spirituelle et culturelle à Gagnoa",
    type: "website",
    locale: "fr_FR",
    siteName: "Baliou Padra",
    url: "https://balioupadra.org",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BALIOU PADRA - Communauté Cheikh Yacouba Sylla",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BALIOU PADRA - Communauté Cheikh Yacouba Sylla",
    description: "Plateforme Numérique de la Communauté Cheikh Yacouba Sylla",
    images: ["/og-image.png"],
    creator: "@balioupadra",
    site: "@balioupadra",
  },
  verification: {
    google: "votre_code_de_verification_google",
    // other: {
    //   "yandex": "votre_code",
    //   "facebook-domain-verification": "votre_code",
    // },
  },
  category: "Religion & Spiritualité",
  classification: "Communauté Religieuse",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "https://balioupadra.org",
    languages: {
      "fr": "https://balioupadra.org/fr",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Meta tags supplémentaires pour SEO */}
        <meta name="geo.region" content="CI" />
        <meta name="geo.placename" content="Gagnoa" />
        <meta name="geo.position" content="6.1333;-5.9333" />
        <meta name="ICBM" content="6.1333, -5.9333" />

        {/* Meta tags pour le responsive mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <meta name="theme-color" content="#146332" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Baliou Padra" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=yes" />
        <meta name="msapplication-TileColor" content="#146332" />

        {/* Meta tags pour les réseaux sociaux */}
        <meta property="og:site_name" content="BALIOU PADRA" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:type" content="website" />

        {/* Meta tags pour Google */}
        <meta name="googlebot" content="index, follow" />
        <meta name="google" content="nositelinkssearchbox" />

        {/* Lien vers le manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Sitemap et RSS */}
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />

        {/* Favicon et icônes Apple */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />

        {/* Préconnexion pour améliorer les performances */}
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="antialiased bg-slate-50">
        {/* La Navbar apparaîtra en haut de chaque page */}
        <Navbar />

        {/* Le contenu de chaque page s'affichera ici */}
        <main>
          {children}
        </main>

        {/* L'ASSISTANT IA FLOATTANT - Présent sur TOUTES les pages */}
        <FloatingAI />
      </body>
    </html>
  );
}