import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Clarity } from "@/shared/components/Clarity";
import { CookieBanner } from "@/shared/components/CookieBanner";

// Shared type system with the marketing landing: Inter for UI, JetBrains Mono
// for code/labels, Instrument Serif for the accent italics in headlines.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Pre-paint theme init. React's dev-only "script tag" notice for inline
            scripts does not apply in production; the script runs from the SSR HTML. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Clarity />
        <CookieBanner />
      </body>
    </html>
  );
}
