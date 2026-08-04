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
      <head>
        {/* Fonts are linked here rather than @import-ed from globals.css so the
            preload scanner can start them immediately, in parallel with the CSS,
            instead of after it. preconnect warms the TLS handshake to both
            Google hosts (the stylesheet host and the separate font-file host)
            while the stylesheet is still in flight. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
        />
      </head>
      <body className="bg-df-pure-black text-df-white font-sans antialiased min-h-screen">
        <DeviceProfileSync />
        {children}
      </body>
    </html>
  );
}
