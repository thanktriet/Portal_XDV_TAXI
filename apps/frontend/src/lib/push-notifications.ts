import { api } from './api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) throw new Error('Push notifications not supported');
  return Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    await sendSubscriptionToServer(existingSubscription);
    return existingSubscription;
  }

  // Create new subscription
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  await sendSubscriptionToServer(subscription);
  return subscription;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return true;

  // Remove from server
  try {
    await api.delete('/notifications/push/unsubscribe', {
      data: { endpoint: subscription.endpoint },
    });
  } catch (error) {
    console.error('Failed to remove subscription from server:', error);
  }

  // Unsubscribe locally
  return subscription.unsubscribe();
}

export async function getSubscriptionStatus(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  await api.post('/notifications/push/subscribe', {
    endpoint: subscription.endpoint,
    p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
    auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Every hour

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}
