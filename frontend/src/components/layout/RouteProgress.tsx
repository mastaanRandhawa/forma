/**
 * RouteProgress — a thin top loading bar (nprogress-style), pure CSS.
 * `is-active` trickles toward 90%; `is-done` snaps to 100% and fades.
 */
export function RouteProgress({ active }: { active: boolean }) {
  return <div className={`route-progress ${active ? "is-active" : "is-done"}`} aria-hidden />;
}
