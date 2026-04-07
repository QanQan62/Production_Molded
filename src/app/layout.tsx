import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOLDED PRODUCTION - PPC",
  description: "Production Planning and Control System",
};

import Navigation from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <Navigation />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
