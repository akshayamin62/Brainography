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
    icon: [
      { url: "/thumbnail.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/thumbnail.png?v=2", type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: "/thumbnail.png?v=2", type: "image/png" }],
    apple: [{ url: "/thumbnail.png?v=2", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Brainography",
    description: "Admin Panel",
    images: [
      {
        url: "/thumbnail.png?v=2",
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
    images: ["/thumbnail.png?v=2"],
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
        <link rel="icon" href="/thumbnail.png?v=2" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/thumbnail.png?v=2" />
      </head>
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
