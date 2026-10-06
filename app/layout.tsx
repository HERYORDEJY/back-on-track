import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { SimulatedBadge } from "@/components/shared/SimulatedBadge";
import { ClockControl } from "@/components/shared/ClockControl";
import { getClockView } from "@/lib/services/clock";
import { getStudentLanguage } from "@/lib/services/students";
import { resolveLanguage, t } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name", "en"),
  description: t("app.description", "en"),
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const learnerId = (await headers()).get("x-backontrack-learner-id");
  const savedLanguage = learnerId ? await getStudentLanguage(learnerId).catch(() => null) : null;
  const language = savedLanguage ?? resolveLanguage((await cookies()).get("lang")?.value);
  const clock = await getClockView().catch(() => null);
  return (
    <html lang={language}>
      <body>
        <a href="#main" className="skip-link">{t("app.skip", language)}</a>
        <header className="site-header page-width">
          <div className="brand-group">
            <Link className="brand" href="/">{t("app.name", language)}</Link>
            <SimulatedBadge language={language} />
          </div>
          <LanguageSwitch language={language} studentId={savedLanguage ? learnerId : null} />
        </header>
        <div className="page-width"><ClockControl clock={clock} language={language} /></div>
        {children}
      </body>
    </html>
  );
}
