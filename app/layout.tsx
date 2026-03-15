import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";

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
