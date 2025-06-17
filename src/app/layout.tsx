import type { Metadata } from "next";
import "@fontsource/geist-sans/latin.css";
import "@fontsource/geist-mono/latin.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { MainNav } from "@/components/main-nav";
import "./globals.css";


export const metadata: Metadata = {
  title: "SQL Manager",
  description: "Modern SQL Server Management Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <QueryProvider>
            {/* Global Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto">
                <MainNav />
              </div>
            </header>
            
            <Toaster />
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
