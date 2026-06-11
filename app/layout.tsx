import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartyPop — אטרקציות לאירועים בקליק",
  description: "הזמינו צמר גפן ואטרקציות לילדים תוך 30 שניות. שתפו, הרוויחו, תהנו 🍭"
};

export const viewport: Viewport = { themeColor: "#0B0B1A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
