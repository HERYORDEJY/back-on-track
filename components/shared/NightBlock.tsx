import type { ReactNode } from "react";

export function NightBlock({ label, listen, children, actions }: { label?: string; listen?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return <section className="night" aria-label={label}>
    {(label || listen) && <div className="night__top">{label && <span className="night__label">{label}</span>}{listen}</div>}
    {children}
    {actions && <div className="night__actions">{actions}</div>}
  </section>;
}
