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

// Production social previews need an absolute base URL. Set NEXT_PUBLIC_SITE_URL
// to the deployed origin; Vercel and local dev are inferred as sensible fallbacks.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL || // Netlify's primary site URL at build time
  "https://ctrl-stud.netlify.app";

const TITLE = "CTRL — Technical assessments built around real work";
const DESCRIPTION =
  "CTRL is a technical assessment platform where applicants solve realistic scenarios based on your company's work. See how they think, what they prioritise, and how their solution performs before you commit to another interview.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "CTRL",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "CTRL",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Runs before paint: applies the saved theme so there is no flash of the wrong
// theme on load. The app defaults to light; dark only when the user chose it.
const themeScript = `(function(){try{var t=localStorage.getItem('ae-theme');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;

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
