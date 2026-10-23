import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/providers";

export const metadata: Metadata = {
  title: "SolarAI — AI Solar Energy Advisor",
  description:
    "SolarAI analyzes your electricity, roof, sunlight and budget with a deterministic calculation engine and AI insights to recommend the right solar energy system for your home or business.",
  keywords: [
    "solar energy",
    "solar advisor",
    "AI solar analysis",
    "solar calculator",
    "renewable energy",
    "rooftop solar",
    "SolarAI",
  ],
  authors: [{ name: "SolarAI" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
