import type { MetadataRoute } from "next";

const siteUrl = "https://verble.fun";
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/archive`, lastModified, changeFrequency: "daily", priority: 0.7 },
  ];
}
