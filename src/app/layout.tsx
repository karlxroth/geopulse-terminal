import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoPulse // Geopolitical Ontology & Macro Intelligence Workstation",
  description:
    "Structured geopolitical entity ontology, multi-source corroboration engine (14+ global feeds), and live market transmission workstation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-[#0a0c10] text-[#d7dde8] antialiased selection:bg-slate-600/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
