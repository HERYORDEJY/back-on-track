import { PIDGIN_ENABLED, t, type MessageKey } from "@/lib/i18n";

export function RouteMessage({ messageKey }: { messageKey: MessageKey }) {
  return <>
    <span className="route-copy-en" lang="en">{t(messageKey, "en")}</span>
    {PIDGIN_ENABLED && <span className="route-copy-pcm" lang="pcm">{t(messageKey, "pcm")}</span>}
  </>;
}
