import type { Metadata } from "next";
import "./globals.css";
// On importe la Navbar qu'on va créer/utiliser
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BALIOU PADRA",
  description: "Fondation Cheikh Yacouba Sylla - Plateforme communautaire",
  manifest: "/manifest.json", // Lien vers le manifest pour PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baliou Padra",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: true,
  },
  themeColor: "#146332",
  applicationName: "Baliou Padra",
  keywords: ["Baliou Padra", "Fondation Yacouba Sylla", "Communauté", "Gagnoa", "Côte d'Ivoire"],
  authors: [{ name: "Baliou Padra Community" }],
  creator: "Baliou Padra",
  publisher: "Baliou Padra Foundation",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
  openGraph: {
    title: "BALIOU PADRA",
    description: "Fondation Cheikh Yacouba Sylla - Plateforme communautaire",
    type: "website",
    locale: "fr_FR",
    siteName: "Baliou Padra",
  },
  twitter: {
    card: "summary_large_image",
    title: "BALIOU PADRA",
    description: "Fondation Cheikh Yacouba Sylla - Plateforme communautaire",
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
        {/* Meta tags pour le responsive mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <meta name="theme-color" content="#146332" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Baliou Padra" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=yes" />
        <meta name="msapplication-TileColor" content="#146332" />

        {/* Lien vers le manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon et icônes Apple */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />

        {/* Préconnexion pour améliorer les performances */}
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="antialiased bg-slate-50">
        {/* La Navbar apparaîtra en haut de chaque page */}
        <Navbar />

        {/* Le contenu de chaque page s'affichera ici */}
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}