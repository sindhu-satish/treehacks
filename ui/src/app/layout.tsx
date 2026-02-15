import type { Metadata } from "next";
import { Nunito, Baloo_2, Geist_Mono } from "next/font/google";
import { MahmProvider } from "@/contexts/MahmContext";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mahm | Your AI Nutritionist & Meal Planner",
  description: "Like having a mom who's also a nutritionist and a personal shopper. Get personalized meal recommendations, find local ingredients, and plan your whole week.",
  keywords: ["meal planning", "nutrition", "AI", "grocery", "recipes", "healthy eating"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${baloo2.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <MahmProvider>
          {children}
        </MahmProvider>
      </body>
    </html>
  );
}
