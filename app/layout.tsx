import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import "./globals.css";
import { uploadRouter } from "@/app/api/uploadthing/core";
import { AppChrome } from "@/components/app-chrome";
import { AppToaster } from "@/components/app-toaster";
import { DesmosCalculatorScript } from "@/components/desmos-calculator-script";
import { pageTitle, siteDescription } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle(),
  description: siteDescription,
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${lexend.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <NextSSRPlugin routerConfig={extractRouterConfig(uploadRouter)} />
        <DesmosCalculatorScript />
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
        >
          Langsung ke isi utama
        </a>
        <AppChrome>{children}</AppChrome>
        <AppToaster />
      </body>
    </html>
  );
}