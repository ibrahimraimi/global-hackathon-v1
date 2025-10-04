import type React from "react";
import { Suspense } from "react";
import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitor Hubbb - Web Application Monitoring",
  description:
    "Monitor your APIs, websites, databases, and webhooks with real-time alerts and analytics",
  keywords: [
    "monitoring",
    "uptime",
    "api monitoring",
    "website monitoring",
    "alerts",
  ],
  authors: [{ name: "Monitor Hubbb" }],
  creator: "Monitor Hubbb",
  publisher: "Monitor Hubbb",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "",
    title: "Monitor Hubbb - Web Application Monitoring",
    description:
      "Monitor your APIs, websites, databases, and webhooks with real-time alerts and analytics",
    siteName: "Monitor Hubbb",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monitor Hubbb - Web Application Monitoring",
    description:
      "Monitor your APIs, websites, databases, and webhooks with real-time alerts and analytics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <Suspense>
            <main>
              {children}
              <Toaster position="bottom-right" richColors />
            </main>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
