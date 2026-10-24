// Browser side of the analytics relay. Fire-and-forget: fetch with keepalive survives navigation (like
// sendBeacon) while sending a normal JSON request, and never blocks the UI.
// Events and properties are typed by the shared contract, so nothing outside the taxonomy can be sent.
import type { ClientEvent } from '@/contracts/events';

export function track<E extends ClientEvent>(name: E['name'], props: E['props']): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/e', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, props }),
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    // Analytics never breaks the page; the relay logs its own failures.
  });
}
