import type { Metadata } from "next";
import { Manrope, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@verble/ui/nav.css";
import "./globals.css";
import "./verble/verble.css";
import "./guess-progress.css";
import "./how-to-play.css";
import "./desktop-game-layout.css";
import AuthStateStorageBoundary from "./components/AuthStateStorageBoundary";
import AnalyticsPageTracker from "./components/AnalyticsPageTracker";
import BottomNav from "./components/BottomNav";
import SiteFooter from "./components/SiteFooter";
import "./stitch.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const isStagingEnvironment = (): boolean => process.env.NEXT_PUBLIC_APP_ENV === "staging";
const twitterImageUrl = "/opengraph-image";
const siteUrl = "https://verble.fun";
const siteName = "Verble.fun";
const siteTitle = "Verble.fun: The Daily Phrase Game";
const siteDescription =
  "Play Verble, a free daily phrase game where you reveal a familiar saying one word at a time.";

export const generateMetadata = (): Metadata => {
  const title = isStagingEnvironment() ? "Verble Staging" : siteTitle;
  const description = siteDescription;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    alternates: { canonical: "/" },
    applicationName: siteName,
    category: "games",
    keywords: ["Verble", "daily phrase game", "word games", "daily word puzzle", "browser games"],
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      siteName,
      url: "/",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twitterImageUrl],
    },
    robots: isStagingEnvironment()
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
    icons: {
      icon: [
        { url: "/apple-icon.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: "/apple-icon.png",
      apple: "/apple-icon.png",
    },
  };
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: siteDescription,
        inLanguage: "en-US",
      },
      {
        "@type": "VideoGame",
        "@id": `${siteUrl}/#game`,
        name: "Verble",
        url: siteUrl,
        description: siteDescription,
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} ${manrope.variable} ${outfit.variable} antialiased`}>
        <AuthStateStorageBoundary />
        <AnalyticsPageTracker />
        {children}
        <SiteFooter />
        <BottomNav />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
