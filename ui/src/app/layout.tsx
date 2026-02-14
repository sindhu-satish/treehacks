import type { Metadata } from "next";
import { Nunito, Fredoka, Geist_Mono } from "next/font/google";
import { MahmProvider } from "@/contexts/MahmContext";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${nunito.variable} ${fredoka.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <MahmProvider>
          {children}
        </MahmProvider>
      </body>
    </html>
  );
}
