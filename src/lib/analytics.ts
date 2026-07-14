/**
 * Lightweight analytics wrapper.
 * - Pushes events to window.dataLayer (works with GTM / GA4 out of the box)
 * - Emits a `gitmoon:track` CustomEvent for any listener
 * - Logs in dev for visibility
 */
export type TrackProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, ...props, ts: Date.now() };
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.gtag?.("event", event, props);
    window.dispatchEvent(new CustomEvent("gitmoon:track", { detail: payload }));
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[analytics]", event, props);
    }
  } catch {
    /* noop */
  }
}

export function pageview(path: string) {
  track("page_view", { path });
}