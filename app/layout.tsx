import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tyvera — Bittensor Subnet Intelligence",
  description:
    "Live subnet analytics and user-approved staking reallocation for Bittensor. You approve every move.",
  keywords: ["Bittensor", "TAO", "staking", "subnet analytics", "crypto", "dTAO", "yield"],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL("https://tyvera.vercel.app"),
  openGraph: {
    title: "Tyvera — Bittensor Subnet Intelligence",
    description:
      "Real-time analytics for 100+ Bittensor subnets. Track yields, emissions, risk scores, and metagraph data — powered by direct Subtensor chain queries.",
    url: "https://tyvera.vercel.app",
    siteName: "Tyvera",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tyvera — Bittensor Subnet Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyvera — Bittensor Subnet Intelligence",
    description:
      "Real-time analytics for 100+ Bittensor subnets. Track yields, emissions, risk scores, and metagraph data.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070a12] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
