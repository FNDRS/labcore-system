import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ConfigureAmplifyClientSide from "@/components/ConfigureAmplifyClientSide";
import { AuthProvider } from "@/contexts/auth-context";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "LabCore LIS - Sistema de trazabilidad",
    template: "%s | LabCore LIS",
  },
  description: "Sistema de trazabilidad para gestión de órdenes de trabajo, muestras y exámenes.",
  keywords: [
    "LIS",
    "laboratorio",
    "laboratorio clínico",
    "trazabilidad",
    "gestión muestras",
    "órdenes de trabajo",
    "exámenes clínicos",
    "LabCore",
  ],
  authors: [{ name: "LabCore" }],
  creator: "LabCore",
  applicationName: "LabCore LIS",
  icons: {
    icon: [
      { url: "/images/favicon.ico", sizes: "any" },
      { url: "/images/favicon.ico", type: "image/x-icon", sizes: "32x32" },
    ],
    apple: "/images/logo-black.png",
  },
  openGraph: {
    title: "LabCore LIS Sistema de trazabilidad",
    description: "Gestión de órdenes de trabajo, muestras y exámenes de laboratorio.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <ConfigureAmplifyClientSide />
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
