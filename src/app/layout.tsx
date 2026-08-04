import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google";
import { QueryProvider } from "@/lib/data/provider";
import { Toaster } from "@/components/shared/toaster";
import { getTheme, htmlClassFor } from "@/lib/theme";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aurora CRM",
  description: "Timeshare Exit Case Management",
};

const themeScript = `
(function(){
  try {
    var m = document.cookie.match(/(?:^||s; )aurora-theme=([^;]+)/);
    var t = m ? m[1] : 'light';
    var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();
  const htmlClass = `${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} h-full antialiased ${htmlClassFor(theme)}`.trim();

  return (
    <html lang="en" className={htmlClass}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
