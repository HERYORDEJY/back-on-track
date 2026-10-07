import Link from "next/link";
import { DrawerFocus } from "@/components/advisor/DrawerFocus";
import { OutreachEditor } from "@/components/advisor/OutreachEditor";
import { formatDate, t, type MessageKey } from "@/lib/i18n";
import { getStudentDetail, listStudents } from "@/lib/services/advisor";
import styles from "@/components/advisor/AdvisorView.module.css";

export const dynamic = "force-dynamic";

type Band = "high" | "medium" | "low";
const bands: (Band | "all")[] = ["all", "high", "medium", "low"];
type Reason = { code: string; params: Record<string, string | number> };

function date(iso: string | null): string {
  return iso ? formatDate(new Date(iso), "en") : t("advisor.neverActive", "en");
}

function reasonText(reason: Reason): string {
  return t(`risk.reason.${reason.code}` as MessageKey, "en", reason.params);
}

function planText(status: "fit" | "cut" | "infeasible" | null): string {
  return t(`advisor.plan.${status ?? "none"}` as MessageKey, "en");
}

function href(band: Band | null, student?: string): string {
  const query = new URLSearchParams();
  if (band) query.set("band", band);
  if (student) query.set("student", student);
  return `/advisor${query.size ? `?${query}` : ""}`;
}

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<{ band?: string; student?: string }> }) {
  const query = await searchParams;
  const band: Band | null = query.band === "high" || query.band === "medium" || query.band === "low" ? query.band : null;
  const selectedId = typeof query.student === "string" && query.student.length <= 80 ? query.student : null;
  const [list, detail] = await Promise.all([listStudents({ band }), selectedId ? getStudentDetail(selectedId) : Promise.resolve(null)]);
  const closeHref = href(band);

  return <main id="main" className={styles.page}>
    <section className={styles.intro} aria-labelledby="advisor-title">
      <div><h1 id="advisor-title">{t("advisor.title", "en")}</h1><p>{t("advisor.intro", "en")}</p></div>
      <div className={styles.metric}>
        <h2>{t("advisor.metric.title", "en")}</h2>
        <strong>{list.metric ? t("advisor.metric.result", "en", list.metric) : t("advisor.metric.empty", "en")}</strong>
        <p>{t("advisor.metric.note", "en")}</p>
      </div>
    </section>
    <div className={styles.toolbar}>
      <div><h2>{t(`advisor.filter.${band ?? "all"}` as MessageKey, "en")}</h2><p>{t("advisor.count", "en", { count: list.rows.length })}</p></div>
      <nav className={styles.filters} aria-label={t("advisor.filter.label", "en")}>
        {bands.map((item) => <Link key={item} href={href(item === "all" ? null : item)} aria-current={(band ?? "all") === item ? "page" : undefined}>{t(`advisor.filter.${item}` as MessageKey, "en")}</Link>)}
      </nav>
    </div>
    {list.rows.length ? <ul className={styles.list}>
      {list.rows.map((row, index) => <li className={`${styles.row} ${styles[row.risk.band]}`} key={row.id} data-testid={index === 0 ? "advisor-row" : undefined}>
        <Link href={href(band, row.id)} aria-label={t("advisor.open", "en", { name: row.name })}>
          <span className={styles.priorityRule} aria-hidden="true" />
          <span><span className={styles.name}>{row.name}</span><span className={styles.band}>{t(`advisor.band.${row.risk.band}` as MessageKey, "en")}</span></span>
          <ul className={styles.reasonList}>{row.risk.reasons.slice(0, 2).map((reason, i) => <li key={`${reason.code}-${i}`}>{reasonText(reason)}</li>)}</ul>
          <span className={styles.meta}><span>{t("advisor.lastActive", "en", { date: date(row.risk.lastActivity) })}</span><span>{planText(row.planStatus)}</span>{row.risk.escalated && <span className={styles.flag}>{t("advisor.escalated", "en")}</span>}</span>
        </Link>
      </li>)}
    </ul> : <p className={styles.empty}>{t("advisor.empty", "en")}</p>}

    {detail && <>
      <Link className={styles.scrim} href={closeHref} tabIndex={-1} aria-hidden="true" />
      <DrawerFocus closeHref={closeHref} label={t("advisor.detail.title", "en", { name: detail.name })}>
        <div className={styles.drawerTop}><h2>{detail.name}</h2><Link className={styles.close} href={closeHref}>{t("advisor.close", "en")}</Link></div>
        <div className={styles.detailPriority} data-band={detail.risk.band}>
          <strong>{t(`advisor.band.${detail.risk.band}` as MessageKey, "en")}</strong>
          <p>{t("advisor.lastActive", "en", { date: date(detail.risk.lastActivity) })}</p>
          <p>{planText(detail.planStatus)}{detail.risk.escalated ? ` · ${t("advisor.escalated", "en")}` : ""}</p>
        </div>
        <section className={styles.detailSection} aria-labelledby="risk-reasons"><h3 id="risk-reasons">{t("advisor.detail.reasons", "en")}</h3><ul>{detail.risk.reasons.map((reason, i) => <li key={`${reason.code}-${i}`}>{reasonText(reason)}</li>)}</ul></section>
        <section className={styles.detailSection} aria-labelledby="missed-title"><h3 id="missed-title">{t("advisor.detail.missed", "en")}</h3>{detail.missedSessions.length ? <ul>{detail.missedSessions.map((missed) => <li key={missed}>{date(missed)}</li>)}</ul> : <p>{t("advisor.detail.noneMissed", "en")}</p>}</section>
        <section className={styles.detailSection} aria-labelledby="activity-title"><h3 id="activity-title">{t("advisor.detail.activity", "en")}</h3>{detail.events.length ? <ol className={styles.timeline}>{detail.events.map((event, i) => <li key={`${event.at}-${event.type}-${i}`}><time dateTime={event.at}>{date(event.at)}</time><span>{t(`advisor.detail.${event.type}` as MessageKey, "en", event.title ? { title: event.title } : {})}</span></li>)}</ol> : <p>{t("advisor.detail.noEvents", "en")}</p>}</section>
        <section className={styles.detailSection}><OutreachEditor key={detail.id} studentId={detail.id} initialDraft={detail.outreach} /></section>
      </DrawerFocus>
    </>}
  </main>;
}
