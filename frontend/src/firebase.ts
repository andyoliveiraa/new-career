import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

let analyticsInstance: Analytics | null = null;
const analyticsReady: Promise<Analytics | null> =
  typeof window !== 'undefined' && firebaseApp
    ? isSupported()
        .then((supported) => {
          if (!supported || !firebaseApp) return null;
          analyticsInstance = getAnalytics(firebaseApp);
          return analyticsInstance;
        })
        .catch(() => null)
    : Promise.resolve(null);

async function getAnalyticsSafe(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  return analyticsReady;
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (!firebaseApp) return;
  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    : undefined;

  void getAnalyticsSafe().then((analytics) => {
    if (!analytics) return;
    try {
      logEvent(analytics, eventName, cleanParams);
    } catch {
      // Ignore analytics delivery errors in restricted browser environments
    }
  });
}

const FIRST_PARTY_API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

const FIRST_PARTY_PAGE_EVENTS = new Set([
  'page_view_login',
  'page_view_register',
  'page_view_rgpd',
  'page_view_privacy',
  'page_view_onboarding',
  'page_view_dashboard',
  'page_view_jobs',
  'page_view_cv_builder',
  'page_view_scrapers',
  'page_view_profile',
  'page_view_settings',
]);

export function trackPageView(screenName: string, pageTitle?: string): void {
  if (typeof window === 'undefined') return;

  const normalized = `page_view_${screenName.replace(/-/g, '_')}`;
  if (FIRST_PARTY_PAGE_EVENTS.has(normalized)) {
    try {
      const token = localStorage.getItem('new_career_token');
      void fetch(`${FIRST_PARTY_API_BASE}/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ event: normalized }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore storage or network errors for non-blocking telemetry
    }
  }

  if (!firebaseApp) return;
  trackEvent('page_view', {
    page_title: pageTitle || screenName,
    page_path: `/${screenName}`,
    page_location: window.location.href,
  });
}

export function setAnalyticsUser(
  userId: string | null,
  properties?: Record<string, string | undefined>
): void {
  if (!firebaseApp) return;
  void getAnalyticsSafe().then((analytics) => {
    if (!analytics) return;
    try {
      setUserId(analytics, userId);
      if (properties) {
        const cleanProps = Object.fromEntries(
          Object.entries(properties).filter(([, v]) => v !== undefined)
        ) as Record<string, string>;
        if (Object.keys(cleanProps).length > 0) {
          setUserProperties(analytics, cleanProps);
        }
      }
    } catch {
      // Ignore analytics errors
    }
  });
}
