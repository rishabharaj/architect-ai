import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ],
};

export const metadata: Metadata = {
  title: "Architect AI",
  description: "Transform your startup idea into a complete technical architecture.",
  openGraph: {
    title: "Architect AI",
    description: "Transform your startup idea into a complete technical architecture.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Architect AI",
    description: "Transform your startup idea into a complete technical architecture.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
