import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idea Quest — The Clubhouse",
  description: "Explore seven creative rooms and turn a half-formed idea into decisions you can defend.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
