import api from './api';

/** Fired whenever this device starts or stops getting push notifications. */
export const PUSH_CHANGED = 'push:changed';

let serverKey;

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !window.Capacitor;
const registration = () => navigator.serviceWorker.getRegistration();
const keyOf = async () => (serverKey ??= (await api.get('/push/key')).key);

/** The server's base64url key as the bytes pushManager.subscribe wants. */
const bytesOf = (base64) => Uint8Array.from(atob(base64.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

/**
 * Where push notifications stand on this device: 'unsupported' (no service worker, e.g. iPhone Safari outside the
 * home-screen app, or push isn't set up on the server), 'blocked' by the browser, 'on' or 'off'.
 */
export async function pushState() {
  if (!supported() || !(await registration()) || !(await keyOf().catch(() => null))) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const subscription = await (await registration()).pushManager.getSubscription();
  return Notification.permission === 'granted' && subscription ? 'on' : 'off';
}

async function subscribe() {
  const { pushManager } = await registration();
  const subscription = (await pushManager.getSubscription()) ?? (await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesOf(await keyOf()) }));
  await api.post('/push/subscriptions', subscription.toJSON());
  window.dispatchEvent(new Event(PUSH_CHANGED));
}

/** Asks for permission (call it from a tap) and registers this device. Resolves to the browser's answer. */
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') await subscribe();
  return permission;
}

/** Re-registers this device after sign-in when notifications are already allowed (browsers also rotate subscriptions). */
export async function syncPush() {
  if (supported() && Notification.permission === 'granted' && (await registration()) && (await keyOf())) await subscribe();
}

/**
 * Stops notifications on this device: the server forgets it and it unsubscribes. `session` is the token to send
 * (on sign-out it is already cleared locally); with `signedOut` the session has ended, so only the browser forgets.
 */
export async function disablePush({ signedOut = false, session } = {}) {
  if (!supported()) return;
  const subscription = await (await registration())?.pushManager.getSubscription();
  if (!subscription) return;
  const headers = session ? { Authorization: `Bearer ${session}` } : undefined;
  if (!signedOut) await api.delete('/push/subscriptions', { data: { endpoint: subscription.endpoint }, headers }).catch(() => {});
  await subscription.unsubscribe();
  window.dispatchEvent(new Event(PUSH_CHANGED));
}

/** This device's push address, so the server can skip pushing to a screen where the app is already open. */
export async function pushEndpoint() {
  if (!supported()) return null;
  return (await (await registration())?.pushManager.getSubscription())?.endpoint ?? null;
}

/** Closes the notifications of a chat once it is open on screen. */
export async function clearChatNotifications(userId) {
  if (!supported()) return;
  const notifications = (await (await registration())?.getNotifications({ tag: `chat-${userId}` })) ?? [];
  notifications.forEach((notification) => notification.close());
}
