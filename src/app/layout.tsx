import type { Metadata } from "next";
import "./globals.css";
import "./mechanical-drawer.css";

export const metadata: Metadata = {
  title: "Diego Obando | Programación y docencia",
  description:
    "Portfolio de Diego Obando: programación, sistemas, herramientas y docencia técnica.",
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
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
