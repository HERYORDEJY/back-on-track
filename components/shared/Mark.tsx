import Link from "next/link";
import { t, type Language } from "@/lib/i18n";

export function Mark({ language }: { language: Language }) {
  return <Link className="mark" href="/"><span className="mark__glyph" aria-hidden="true" /><span>{t("app.name", language)}</span></Link>;
}
