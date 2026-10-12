import type { Metadata } from "next";
import { Geist_Mono, SUSE } from "next/font/google";
import "./globals.css";

const suse = SUSE({
  variable: "--font-suse",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#101010",
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  title: "Le Ménestrel by zeimacode — Radios du monde & enregistrement",
  appleWebApp: {
    capable: true,
    title: "Ménestrel",
    statusBarStyle: "black-translucent" as const,
  },
  description: "Écoute des milliers de radios du monde entier et enjoy toi!.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${suse.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
