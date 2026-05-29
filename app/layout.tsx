import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// Tipografia da marca (self-host via next/font): Space Grotesk (display) + Inter (corpo).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
    "O hub do mestre de RPG: organize campanhas, documente sessões, crie mundos e evolua como narrador. Plataforma Nuckturp.",
  applicationName: "QG do Mestre",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "QG do Mestre — Nuckturp",
    title: "QG do Mestre — Nuckturp",
    description:
      "O hub do mestre de RPG: campanhas, sessões, diário e mundos, num só lugar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${spaceGrotesk.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
