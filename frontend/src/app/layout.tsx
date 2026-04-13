import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Brainography",
  description: "Admin Panel",
  icons: {
    icon: "/thumbnail.png",
    shortcut: "/thumbnail.png",
    apple: "/thumbnail.png",
  },
  openGraph: {
    title: "Brainography",
    description: "Admin Panel",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "Brainography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brainography",
    description: "Admin Panel",
    images: ["/thumbnail.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <main className="grow">
          {children}
        </main>
      </body>
    </html>
  );
}
