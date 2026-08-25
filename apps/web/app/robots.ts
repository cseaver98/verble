import type { MetadataRoute } from "next";

const siteUrl = "https://verble.fun";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_APP_ENV === "staging") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
