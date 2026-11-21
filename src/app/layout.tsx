import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoPulse Terminal — AI-Native Geopolitical & Market Intelligence",
  description:
    "Vollautomatisches Echtzeit-Geopolitik- & Makromarkt-Intelligence-Terminal mit Live-Weltkarte, Eskalations-Index, Quellen-Verifikation und Markt-Impact-Signalen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-[#05080f] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
