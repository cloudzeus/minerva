import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MINERVA - Device Monitoring System",
  description: "Advanced IoT device monitoring and management system with real-time telemetry, temperature alerts, and role-based access control",
  authors: [
    {
      name: "Giannis Kozyris",
      url: "https://minerva.wwa.gr",
    },
  ],
  creator: "Giannis Kozyris",
  publisher: "Giannis Kozyris",
  keywords: [
    "IoT",
    "Device Monitoring",
    "Temperature Sensors",
    "Milesight",
    "Real-time Telemetry",
    "RBAC",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

