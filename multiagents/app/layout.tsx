import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahm — Your AI Nutritionist",
  description: "Like having a mom who's also a nutritionist and a personal shopper.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
