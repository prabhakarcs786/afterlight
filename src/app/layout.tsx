import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Afterlight | A fictional museum of ordinary things",
  description: "An interactive collection of everyday objects, imagined futures, and human-reviewed interpretations. Built with Sanity.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><a className="skip-link" href="#main">Skip to content</a>{children}</body>
    </html>
  );
}
