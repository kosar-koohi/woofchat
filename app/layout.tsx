import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Woofchat — answers for dog owners",
  description: "Training, behavior, and care questions answered for your dog.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
