import "./globals.css";

const isStagingEnvironment = () => process.env.NEXT_PUBLIC_APP_ENV === "staging";

export const generateMetadata = () => ({
  title: isStagingEnvironment() ? "Verble Admin Staging" : "Verble Admin",
  description: "Phrase curation and scheduling for Verble.",
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
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
