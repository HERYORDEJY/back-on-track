import type { ReactNode } from "react";

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice${error ? " notice--error" : ""}`} role={error ? "alert" : undefined}>{children}</div>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
