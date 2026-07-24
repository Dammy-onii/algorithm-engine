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
  title: "Algorithm Engine — Milestone 1",
  description:
    "A generic simulation engine that runs an autonomous agent inside a world via observe → decide → act → update → render.",
};

// Runs before paint: applies the saved theme (or the OS setting) so there is no
// flash of the wrong theme on load. Kept tiny and dependency-free on purpose.
const themeScript = `(function(){try{var t=localStorage.getItem('ae-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((!t||t==='system')&&m);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
