import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { NavScrollProvider } from "@/components/nav-scroll-provider";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";
import { AppToaster } from "@/components/app-toaster";
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${lexend.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        <NavScrollProvider>
          <Navbar />
          <SiteMain>{children}</SiteMain>
          <Footer />
          <AppToaster />
        </NavScrollProvider>
      </body>
    </html>
  );
}