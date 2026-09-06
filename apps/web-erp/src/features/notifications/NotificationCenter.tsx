import { initFirebaseClient } from '@synapse/firebase/client';
import { Bell } from 'lucide-react';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';
import { env } from '../../lib/env';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  count: number;
  readAt: string | null;
  updatedAt: string;
};

// eslint-disable-next-line max-lines-per-function
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const load = useCallback(
    () =>
      apiRequest<{ items: NotificationItem[] }>('/notifications')
        .then((page) => setItems(page.items))
        .catch(() => undefined),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const unread = items.filter((item) => !item.readAt).length;

  async function enablePush() {
    if (!(await isSupported()) || !env.firebase.VITE_FIREBASE_VAPID_KEY) return;
    if ((await Notification.requestPermission()) !== 'granted') return;
    const params = new URLSearchParams({
      apiKey: env.firebase.VITE_FIREBASE_API_KEY ?? '',
      authDomain: env.firebase.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: env.firebase.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: env.firebase.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: env.firebase.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: env.firebase.VITE_FIREBASE_APP_ID ?? '',
    });
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params}`,
    );
    const messaging = getMessaging(initFirebaseClient(env.firebase));
    const token = await getToken(messaging, {
      vapidKey: env.firebase.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token)
      await apiRequest('/notifications/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: 'web' }),
      });
    onMessage(messaging, () => void load());
  }

  async function markRead(id: string) {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    await load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unread ? (
          <span className="absolute right-1.5 top-1 rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <section className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b p-4">
            <strong className="text-sm">Notificações</strong>
            <button
              className="text-xs font-semibold text-blue-600"
              onClick={() => void enablePush()}
            >
              Ativar push
            </button>
          </header>
          <div className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => void markRead(item.id)}
                className={`block w-full border-b p-4 text-left hover:bg-slate-50 ${item.readAt ? 'opacity-60' : 'bg-blue-50/40'}`}
              >
                <strong className="block text-xs">
                  {item.title}
                  {item.count > 1 ? ` (${item.count})` : ''}
                </strong>
                <span className="mt-1 block text-xs text-slate-500">{item.body}</span>
              </button>
            ))}
            {!items.length ? (
              <p className="p-8 text-center text-xs text-slate-400">Nenhuma notificação.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
