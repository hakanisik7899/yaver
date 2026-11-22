import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import "./globals.css";

// Display: characterful grotesque for greetings and titles.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
});

// Body: clean, highly legible, full Turkish support.
const body = Onest({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Yaver",
  description: "Günlük işlerini anlayan, planlayan ve senin onayınla halleden asistan.",
  applicationName: "Yaver",
  appleWebApp: { capable: true, title: "Yaver", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the layout extend under the notch; safe-area padding is in globals.css.
  viewportFit: "cover",
  themeColor: "#050816",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
