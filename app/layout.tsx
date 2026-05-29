import type { Metadata } from "next";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Tipografia da marca (self-host via next/font): Space Grotesk (display) + Geist (corpo) + Geist Mono (números).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nuckturp.com.br"),
  title: {
    default: "QG do Mestre — Nuckturp",
    template: "%s · QG do Mestre",
  },
  description:
    "O QG do mestre de RPG: suas campanhas, sessões, notas e mundo num lugar só, em vez de espalhados por planilhas e apps soltos.",
  applicationName: "QG do Mestre",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "QG do Mestre — Nuckturp",
    title: "QG do Mestre — Nuckturp",
    description: "O QG do mestre de RPG: campanhas, sessões, diário e mundo num lugar só.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${spaceGrotesk.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-dvh font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
