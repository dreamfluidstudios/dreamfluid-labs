import type { Metadata } from "next";
import { DeviceProfileSync } from "@/components/DeviceProfileSync/DeviceProfileSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreamfluid Labs",
  description: "An engine for vision",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='50' dominant-baseline='central' text-anchor='middle' font-size='80'>🧪</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-df-pure-black text-df-white font-sans antialiased min-h-screen">
        <DeviceProfileSync />
        {children}
      </body>
    </html>
  );
}
