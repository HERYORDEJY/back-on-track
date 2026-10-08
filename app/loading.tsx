import { RouteMessage } from "@/components/shared/RouteMessage";

export default function Loading() {
  return <main id="main" className="route-state page-width" role="status">
    <div className="route-state__rule" aria-hidden="true"><span /></div>
    <h1><RouteMessage messageKey="route.loading.title" /></h1>
    <p><RouteMessage messageKey="route.loading.note" /></p>
  </main>;
}
