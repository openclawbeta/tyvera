import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAO Navigator — Bittensor Subnet Intelligence",
  description:
    "Live subnet analytics and user-approved staking reallocation for Bittensor. You approve every move.",
  keywords: ["Bittensor", "TAO", "staking", "subnet analytics", "crypto"],
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
