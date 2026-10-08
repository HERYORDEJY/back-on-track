import type { ReactNode } from "react";

export function EmphasizedText({ text, terms }: { text: string; terms: string[] }): ReactNode {
  const names = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text.split(pattern).map((part, index) => names.includes(part)
    ? <strong className="assessment-name" key={index}>{part}</strong>
    : part);
}
