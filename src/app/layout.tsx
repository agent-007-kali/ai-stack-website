import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-solutions.company"),
  title: "AI Solutions | Local-first accounting agents & AI sessions",
  description:
    "AI Solutions brings local-first accounting assistance, technical and protective agents, and phone access to small UK firms. Explore the system and book an AI session.",
  keywords: [
    "AI Solutions",
    "local AI",
    "accounting assistant",
    "AI agents",
    "AI sessions London",
  ],
  openGraph: {
    title: "AI Solutions | Local-first accounting agents & AI sessions",
    description:
      "AI Solutions brings local-first accounting assistance, technical and protective agents, and phone access to small UK firms. Explore the system and book an AI session.",
    type: "website",
    url: "https://ai-solutions.company/",
    siteName: "AI Solutions",
  },
  twitter: {
    card: "summary",
    title: "AI Solutions | Local-first accounting agents & AI sessions",
    description:
      "AI Solutions brings local-first accounting assistance, technical and protective agents, and phone access to small UK firms. Explore the system and book an AI session.",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
