import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeProvider } from "@/lib/realtime-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Minerva RBAC - Role-Based Access Control System",
  description: "Modern RBAC system built with Next.js 15, Auth.js v5, and Prisma",
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
          <RealtimeProvider>
            {children}
            <Toaster />
          </RealtimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

