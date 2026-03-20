import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Stack Agency - Build Your AI Stack | ai-solutions.company",
  description: "Build your perfect AI stack with our AI-powered sales agent. Modular AI capabilities. Pay per feature. Live in 60 seconds. Powered by OpenClaw.",
  keywords: ["AI stack", "AI agent", "build your stack", "OpenClaw", "AI chatbot", "automation"],
  openGraph: {
    title: "AI Stack Agency - Build Your AI Stack",
    description: "Build your perfect AI stack. AI-powered sales agent helps you choose. Pay per feature. Live in 60 seconds.",
    type: "website",
    url: "https://ai-solutions.company",
    siteName: "AI Stack Agency"
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Stack Agency - Build Your AI Stack",
    description: "Build your perfect AI stack. AI-powered sales agent helps you choose. Pay per feature."
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>",
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
