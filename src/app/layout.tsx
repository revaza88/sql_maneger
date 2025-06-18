import type { Metadata } from "next";
import "@fontsource/geist-sans/latin.css";
import "@fontsource/geist-mono/latin.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { MainNav } from "@/components/main-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL Manager V4 - Professional Database Management",
  description: "Advanced SQL Server management platform with real-time monitoring, user management, and secure database operations.",
  keywords: ["SQL Server", "Database Management", "Admin Panel", "Database Backup", "User Management"],
  authors: [{ name: "SQL Manager Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="relative flex min-h-screen flex-col">
              {/* Enhanced Navigation */}
              <MainNav />
              
              {/* Main Content */}
              <main className="flex-1">
                {children}
              </main>
            </div>
            
            {/* Toast Notifications */}
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
