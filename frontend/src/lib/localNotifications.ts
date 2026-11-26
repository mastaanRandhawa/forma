/**
 * Notifications for the no-backend build. The sample notifications are fixed, so what
 * you read or dismiss is remembered separately and applied on top of them.
 */
import type { NotificationList } from "../api/types";
import { demoNotifications } from "../api/demo";

const KEY = "forma.notifications.v1";
interface State { read: string[]; removed: string[] }

const load = (): State => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<State> | null;
    return { read: raw?.read ?? [], removed: raw?.removed ?? [] };
  } catch {
    return { read: [], removed: [] };
  }
};
const save = (s: State) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
};

export function localNotifications(): NotificationList {
  const s = load();
  const now = new Date().toISOString();
  const items = demoNotifications()
    .items.filter((n) => !s.removed.includes(n.id))
    .map((n) => (s.read.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n));
  return { items, unreadCount: items.filter((n) => !n.readAt).length };
}

export const readLocalNotification = (id: string) => { const s = load(); if (!s.read.includes(id)) save({ ...s, read: [...s.read, id] }); };
export const readAllLocalNotifications = () => { const s = load(); save({ ...s, read: demoNotifications().items.map((n) => n.id) }); };
export const removeLocalNotification = (id: string) => { const s = load(); save({ ...s, removed: [...s.removed, id] }); };
