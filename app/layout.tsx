import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Role Fit — Career & Hiring Intelligence",
    template: "%s · Role Fit",
  },
  description:
    "AI understands. Role Fit measures. Humans decide. Role Fit turns job requirements and candidate evidence into structured, explainable role-fit insights.",
  applicationName: "Role Fit",
};

export const viewport: Viewport = {
  themeColor: "#14161A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrainsMono.variable)}>
      <body className="min-h-screen bg-nirman-bg font-sans text-nirman-dark antialiased">
        {children}
      </body>
    </html>
  );
}
