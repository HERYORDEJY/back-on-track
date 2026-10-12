import Link from "next/link";
import { DrawerFocus } from "@/components/advisor/DrawerFocus";
import { AdvisorNavigation } from "@/components/advisor/AdvisorNavigation";
import { OutreachEditor } from "@/components/advisor/OutreachEditor";
import { EmphasizedText } from "@/components/shared/EmphasizedText";
import { Signal } from "@/components/shared/Signal";
import { MiniLine } from "@/components/shared/MiniLine";
import { formatDate, formatRiskReason, t, type MessageKey } from "@/lib/i18n";
import { getStudentDetail, listStudents } from "@/lib/services/advisor";
import styles from "@/components/advisor/AdvisorView.module.css";

export const dynamic = "force-dynamic";

type Band = "high" | "medium" | "low";
const bands: (Band | "all")[] = ["all", "high", "medium", "low"];
const pageSize = 40;
type Reason = { code: string; params: Record<string, string | number> };

function date(iso: string | null): string {
  return iso ? formatDate(new Date(iso), "en") : t("advisor.neverActive", "en");
}

function reasonText(reason: Reason): string {
  return formatRiskReason(reason.code, reason.params, "en");
}

function reasonView(reason: Reason) {
  return <EmphasizedText text={reasonText(reason)} terms={[String(reason.params.assessment ?? "")]} />;
}

function planText(status: "fit" | "cut" | "infeasible" | null): string {
  return t(`advisor.plan.${status ?? "none"}` as MessageKey, "en");
}

function href(band: Band | null, page = 1, student?: string): string {
  const query = new URLSearchParams();
  if (band) query.set("band", band);
  if (page > 1) query.set("page", String(page));
  if (student) query.set("student", student);
  return `/advisor${query.size ? `?${query}` : ""}`;
}

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<{ band?: string; page?: string; student?: string }> }) {
  const query = await searchParams;
  const band: Band | null = query.band === "high" || query.band === "medium" || query.band === "low" ? query.band : null;
  const selectedId = typeof query.student === "string" && query.student.length <= 80 ? query.student : null;
  const [list, detail] = await Promise.all([listStudents({ band }), selectedId ? getStudentDetail(selectedId) : Promise.resolve(null)]);
  const pages = Math.max(1, Math.ceil(list.rows.length / pageSize));
  const requestedPage = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page) ? Number(query.page) : 1;
  const page = Math.min(requestedPage, pages);
  const rows = list.rows.slice((page - 1) * pageSize, page * pageSize);
  const closeHref = href(band, page);

  return <main id="main" className={styles.page}>
    <section className={styles.intro} aria-labelledby="advisor-title">
      <h1 id="advisor-title">{t("advisor.title", "en")}</h1>
      <p className={styles.lede}>{list.metric ? t("advisor.metric.result", "en", list.metric) : t("advisor.metric.empty", "en")}</p>
      <p className={styles.introNote}>{t("advisor.intro", "en")} {t("advisor.metric.note", "en")}</p>
    </section>
    <div className={styles.toolbar}>
      <div><h2>{t(`advisor.filter.${band ?? "all"}` as MessageKey, "en")}</h2><p>{t("advisor.count", "en", { count: list.rows.length })}</p></div>
      <nav className={styles.filters} aria-label={t("advisor.filter.label", "en")}>
        {bands.map((item) => <Link key={item} href={href(item === "all" ? null : item)} aria-current={(band ?? "all") === item ? "page" : undefined}>{t(`advisor.filter.${item}` as MessageKey, "en")} <span className={styles.filterCount}>{list.counts[item]}</span></Link>)}
      </nav>
    </div>
    <AdvisorNavigation renderedHref={href(band, page, selectedId ?? undefined)} detailId={detail?.id ?? null}>
    <div className={styles.listHead} aria-hidden="true"><span>{t("advisor.column.student", "en")}</span><span>{t("advisor.column.progress", "en")}</span><span>{t("advisor.column.priority", "en")}</span><span>{t("advisor.column.why", "en")}</span></div>
    {list.rows.length ? <ul className={styles.list} data-testid="advisor-list">
      {rows.map((row, index) => <li className={`${styles.row} ${styles[row.risk.band]}`} key={row.id} data-band={row.risk.band} data-selected={row.id === detail?.id} data-testid={index === 0 ? "advisor-row" : undefined}>
        <Link href={href(band, page, row.id)} scroll={false} prefetch={false} aria-label={t("advisor.open", "en", { name: row.name })}>
          <span className={styles.priorityRule} aria-hidden="true" />
          <span className={styles.studentCell}><span className={styles.name}>{row.name}</span><span className={styles.seen}>{t("advisor.lastActive", "en", { date: date(row.risk.lastActivity) })}</span>{row.risk.escalated && <span className={styles.flag}>{t("advisor.callFirst", "en")}</span>}</span>
          <div className={styles.progressCell}><MiniLine doneWeek={row.doneThroughWeek} week={list.week} totalWeeks={list.totalWeeks} language="en" /><span className={styles.week}>{t("advisor.weekProgress", "en", { week: row.doneThroughWeek, total: list.totalWeeks })}</span><span className={styles.planStatus} data-status={row.planStatus ?? "none"}>{planText(row.planStatus)}</span></div>
          <span className={styles.band}><Signal band={row.risk.band} language="en" label={t(`advisor.band.${row.risk.band}` as MessageKey, "en")} /></span>
          <span className={styles.reasonList}>{row.risk.reasons.slice(0, 2).map((reason, i) => <span key={`${reason.code}-${i}`}>{reasonView(reason)}</span>)}</span>
        </Link>
      </li>)}
    </ul> : <p className={styles.empty}>{t("advisor.empty", "en")}</p>}
    {list.rows.length > pageSize && <nav className={styles.pagination} aria-label={t("advisor.pages.label", "en")}>
      {page > 1 ? <Link href={href(band, page - 1)}>{t("advisor.pages.previous", "en")}</Link> : <span />}
      <span aria-live="polite">{t("advisor.pages.status", "en", { page, pages })}</span>
      {page < pages ? <Link href={href(band, page + 1)}>{t("advisor.pages.next", "en")}</Link> : <span />}
    </nav>}
    {detail && <>
      <DrawerFocus studentId={detail.id} closeHref={closeHref} name={detail.name} label={t("advisor.detail.title", "en", { name: detail.name })}>
        <div className={styles.detailPriority} data-band={detail.risk.band}>
          <strong>{t(`advisor.band.${detail.risk.band}` as MessageKey, "en")}</strong>
          <p>{t("advisor.lastActive", "en", { date: date(detail.risk.lastActivity) })}</p>
          <p>{planText(detail.planStatus)}{detail.risk.escalated ? ` · ${t("advisor.escalated", "en")}` : ""}</p>
        </div>
        <section className={styles.detailSection}><OutreachEditor key={detail.id} studentId={detail.id} initialDraft={detail.outreach} initialDraftsUsed={detail.draftsUsedThisWeek} /></section>
        <section className={styles.detailSection} aria-labelledby="risk-reasons"><h3 id="risk-reasons">{t("advisor.detail.reasons", "en")}</h3><ul>{detail.risk.reasons.map((reason, i) => <li key={`${reason.code}-${i}`}>{reasonView(reason)}</li>)}</ul></section>
        <section className={styles.detailSection} aria-labelledby="missed-title"><h3 id="missed-title">{t("advisor.detail.missed", "en")}</h3>{detail.missedSessions.length ? <ul>{detail.missedSessions.map((missed) => <li key={missed}>{date(missed)}</li>)}</ul> : <p>{t("advisor.detail.noneMissed", "en")}</p>}</section>
        <section className={styles.detailSection} aria-labelledby="activity-title"><h3 id="activity-title">{t("advisor.detail.activity", "en")}</h3>{detail.events.length ? <ol className={styles.timeline}>{detail.events.map((event, i) => <li key={`${event.at}-${event.type}-${i}`}><time dateTime={event.at}>{date(event.at)}</time><span>{t(`advisor.detail.${event.type}` as MessageKey, "en", event.title ? { title: event.title } : {})}</span></li>)}</ol> : <p>{t("advisor.detail.noEvents", "en")}</p>}
          {detail.outreach && <div className={styles.outreachHistory}><h4>{t("advisor.outreach.latest", "en")}</h4><p>{t("advisor.outreach.draftedAt", "en", { date: date(detail.outreach.createdAt) })}</p><p>{t(detail.outreach.contacted ? "advisor.outreach.contactTimeUnknown" : "advisor.outreach.noContact", "en")}</p><blockquote>{detail.outreach.message}</blockquote></div>}
        </section>
      </DrawerFocus>
    </>}
    </AdvisorNavigation>
  </main>;
}
