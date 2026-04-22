import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diego Obando | Software Developer and Technical Instructor",
  description:
    "Problem-solving across fullstack delivery, applied AI, LLM integrations, RAG, agents, and technical teaching.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
