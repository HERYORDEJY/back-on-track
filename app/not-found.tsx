import Link from "next/link";
import { RouteMessage } from "@/components/shared/RouteMessage";

export default function NotFound() {
  return <main id="main" className="route-state page-width">
    <div className="route-state__rule" aria-hidden="true" />
    <h1><RouteMessage messageKey="route.notFound.title" /></h1>
    <p><RouteMessage messageKey="route.notFound.note" /></p>
    <div className="route-state__actions">
      <Link href="/"><RouteMessage messageKey="route.home" /></Link>
    </div>
  </main>;
}
