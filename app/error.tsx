"use client";

import Link from "next/link";
import { RouteMessage } from "@/components/shared/RouteMessage";

export default function Error({ reset }: { reset: () => void }) {
  return <main id="main" className="route-state page-width" role="alert">
    <div className="route-state__rule" aria-hidden="true" />
    <h1><RouteMessage messageKey="route.error.title" /></h1>
    <p><RouteMessage messageKey="route.error.note" /></p>
    <div className="route-state__actions">
      <button type="button" onClick={() => reset()}><RouteMessage messageKey="route.retry" /></button>
      <Link href="/"><RouteMessage messageKey="route.home" /></Link>
    </div>
  </main>;
}
