import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Mono only styles small labels, never the LCP text, so it needn't block first paint.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  keywords: [site.name, ...site.alternateNames, site.jobTitle, "Toma", "Microsoft", "UCLA"],
  alternates: { canonical: "/" },
  // Search Console ownership for the https://rayhuang.us/ URL-prefix property; the DNS is managed outside this repo.
  verification: { google: "CZDnchsLSK8epzipSyXv6zQv_G5-rt_CFgCWDpqBP6M" },
  openGraph: {
    type: "profile",
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
    firstName: "Ray",
    lastName: "Huang",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: `${site.name}, ${site.jobTitle} in San Francisco` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c9f1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4f6e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
