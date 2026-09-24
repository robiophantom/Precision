import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Precision",
  description: "How accurately can you measure time?",
  icons: {
    icon: "/precision-logo.png",
    shortcut: "/precision-logo.png",
    apple: "/precision-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/30">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
