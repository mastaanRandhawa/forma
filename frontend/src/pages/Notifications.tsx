import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { API_ENABLED, errorMessage, invalidateResource, notifyNotificationsChanged, useNotifications } from "../api/hooks";
import { readAllLocalNotifications, readLocalNotification, removeLocalNotification } from "../lib/localNotifications";
import { api } from "../api/client";
import type { Notification, NotificationList } from "../api/types";

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

/** Everything Forma has told you: read it, jump to it, mark it read, or dismiss it. */
export default function Notifications() {
  const { data, error, initialLoading, refetch, mutate } = useNotifications();
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  const set = (next: Notification[]) => {
    const list: NotificationList = { items: next, unreadCount: next.filter((n) => !n.readAt).length };
    mutate(list);
    invalidateResource("dashboard");
  };

  const guard = async (fn: () => Promise<unknown>, revert: () => void) => {
    setMsg(null);
    try {
      await fn();
      notifyNotificationsChanged();
    } catch (e) {
      revert();
      setMsg(errorMessage(e as Error));
    }
  };

  const markRead = (n: Notification) => {
    if (n.readAt) return;
    const before = items;
    set(items.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    if (API_ENABLED) void guard(() => api.notifications.markRead(n.id), () => set(before));
    else { readLocalNotification(n.id); notifyNotificationsChanged(); }
  };
  const markAll = () => {
    const before = items;
    const now = new Date().toISOString();
    set(items.map((x) => ({ ...x, readAt: x.readAt ?? now })));
    if (API_ENABLED) void guard(() => api.notifications.markAllRead(), () => set(before));
    else { readAllLocalNotifications(); notifyNotificationsChanged(); }
  };
  const remove = (n: Notification) => {
    const before = items;
    set(items.filter((x) => x.id !== n.id));
    if (API_ENABLED) void guard(() => api.notifications.remove(n.id), () => set(before));
    else { removeLocalNotification(n.id); notifyNotificationsChanged(); }
  };
  const open = (n: Notification) => {
    markRead(n);
    if (n.deepLink?.startsWith("/")) nav(n.deepLink);
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader eyebrow="inbox" title="what's" ghost="new">
        {unread > 0 && (
          <button onClick={markAll} className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.07] px-4 py-2 text-[0.84rem] lowercase text-content-primary hover:bg-white/[0.13]">
            <Check size={14} strokeWidth={2.25} /> mark all read
          </button>
        )}
      </PageHeader>

      {msg && <p role="alert" className="mb-4 text-[0.84rem] text-[var(--accent-amber)]">{msg}</p>}

      {initialLoading ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[72px] rounded-2xl" />)}</div>
      ) : error && items.length === 0 ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="all caught up" body="reminders, records and notes from Kai show up here." />
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id} className={`relative flex items-start gap-3 rounded-2xl border p-3.5 ${n.readAt ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.14] bg-white/[0.05]"}`}>
              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full surface-recessed text-content-secondary">
                <Bell size={14} />
              </span>
              <button onClick={() => open(n)} className="focus-ring min-w-0 flex-1 rounded-lg text-left">
                <div className="flex items-baseline gap-2">
                  <span className={`truncate text-[0.9rem] ${n.readAt ? "text-content-secondary" : "text-content-primary"}`}>{n.title}</span>
                  {!n.readAt && <span aria-label="unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-pink)]" />}
                </div>
                <div className="mt-0.5 text-[0.82rem] text-content-tertiary">{n.body}</div>
                <div className="label-instrument mt-1">{ago(n.createdAt)}</div>
              </button>
              <button onClick={() => remove(n)} aria-label={`dismiss ${n.title}`} className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-content-tertiary hover:text-content-primary">
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
