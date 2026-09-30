import type { Metadata, ReactNode } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurelia Studio | Thoughtful care, beautifully scheduled",
  description:
    "A premium appointment booking experience for beauty and wellness services.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
