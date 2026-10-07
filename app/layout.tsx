import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nirman — Career & Hiring Intelligence",
  description:
    "Make better career and hiring decisions from real evidence. Nirman turns job requirements and candidate evidence into structured, explainable insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-nirman-bg text-nirman-dark antialiased">
        {children}
      </body>
    </html>
  );
}
