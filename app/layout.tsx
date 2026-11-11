import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getSettings() {
  try {
    const allSettings = await db.select().from(settings);
    const settingsObj = allSettings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      siteTitle: settingsObj.siteTitle || "Les envies de la famille",
      homepageSubtext:
        settingsObj.homepageSubtext || "Des idées pour faire plaisir à chacun.",
    };
  } catch (error) {
    return {
      siteTitle: "Les envies de la famille",
      homepageSubtext: "Des idées pour faire plaisir à chacun.",
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.siteTitle,
    description: "Les listes d’idées cadeaux de la famille.",
    icons: {
      icon: "/icon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased bg-gray-50 dark:bg-gray-900">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
