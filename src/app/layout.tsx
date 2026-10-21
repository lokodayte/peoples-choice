import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import VoterSync from "@/components/VoterSync";
import { CONFERENCE_NAME } from "@/lib/categories";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `People's Choice Awards · ${CONFERENCE_NAME}`,
  description: `Vote for your favorite talks at the ${CONFERENCE_NAME}.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a6192e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <VoterSync />
        {children}
      </body>
    </html>
  );
}
