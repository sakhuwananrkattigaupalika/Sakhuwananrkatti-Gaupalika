/**
 * PWA Service Worker Notification Utility
 * Manages browser notification permissions, Service Worker showNotification triggers,
 * and automated alerts when grievance statuses are updated.
 */

import { ComplaintStatus, Language } from '../types';
import { translations } from '../i18n/translations';

const SUBSCRIPTION_STORAGE_KEY = 'skk_subscribed_grievance_alerts_v1';
const LAST_KNOWN_STATUS_KEY = 'skk_grievance_last_known_status_v1';

export class PWANotificationService {
  /**
   * Check if notifications are supported in the current environment
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Check current notification permission
   */
  static getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission from the user
   */
  static async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return Notification.permission;
    }
  }

  /**
   * Show notification via Service Worker registration (native PWA notification)
   */
  static async showNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!this.isSupported()) return false;

    // Request permission if not already decided
    if (Notification.permission === 'default') {
      const perm = await this.requestPermission();
      if (perm !== 'granted') return false;
    }

    if (Notification.permission !== 'granted') return false;

    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      vibrate: [250, 100, 250],
      requireInteraction: false,
      ...options,
    };

    // 1. Primary Path: Show via Service Worker Registration (PWA native notification)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (err) {
        console.warn('ServiceWorker ready showNotification failed, trying fallback:', err);
      }
    }

    // 2. Secondary Path: Fallback to window Notification constructor
    try {
      const n = new Notification(title, notificationOptions);
      if (notificationOptions.data?.url) {
        n.onclick = () => {
          window.focus();
          window.location.href = notificationOptions.data.url;
          n.close();
        };
      }
      return true;
    } catch (fallbackErr) {
      console.error('Notification fallback error:', fallbackErr);
      return false;
    }
  }

  /**
   * Send custom 'Status Updated' (स्थिति अद्यावधिक भयो) browser notification for a grievance
   */
  static async notifyGrievanceStatusChange(params: {
    referenceNumber: string;
    title: string;
    newStatus: ComplaintStatus;
    lang?: Language;
    reason?: string;
  }): Promise<boolean> {
    const { referenceNumber, title, newStatus, lang = 'ne', reason } = params;
    const t = translations[lang] || translations.ne;

    // Get localized status text
    const statusKey = `status_${newStatus}` as keyof typeof t;
    const localizedStatus = (t[statusKey] as string) || newStatus;

    const notifTitle = lang === 'en'
      ? `Grievance Status Updated: ${referenceNumber}`
      : `गुनासो स्थिति अद्यावधिक: ${referenceNumber}`;

    const reasonText = reason ? ` (${reason})` : '';
    const notifBody = lang === 'en'
      ? `Status has been updated to "${localizedStatus}"${reasonText}.\nSubject: ${title}`
      : `तपाईंको गुनासोको स्थिति परिवर्तन भई "${localizedStatus}" भएको छ${reasonText}। विषय: ${title}`;

    return this.showNotification(notifTitle, {
      body: notifBody,
      tag: `status-update-${referenceNumber}`,
      data: {
        ref: referenceNumber,
        url: `/?ref=${encodeURIComponent(referenceNumber)}&portal=track`,
      },
    });
  }

  /**
   * Send a test 'Status Updated' notification for immediate user verification
   */
  static async sendTestNotification(referenceNumber = 'SKK-2026-001', lang: Language = 'ne'): Promise<boolean> {
    const t = translations[lang] || translations.ne;
    const title = lang === 'en'
      ? 'Status Updated (PWA Alert Active)'
      : 'स्थिति अद्यावधिक भयो (PWA अलर्ट सक्रिय)';

    const body = lang === 'en'
      ? `Test alert for token ${referenceNumber}: Service Worker is configured to alert you whenever your case status changes.`
      : `नमुना अलर्ट टोकन नं. ${referenceNumber}: सेवाग्राहीको गुनासो स्थिति परिवर्तन हुँदा यसैगरी तत्काल अलर्ट प्राप्त हुनेछ।`;

    return this.showNotification(title, {
      body,
      tag: `test-status-${Date.now()}`,
      data: {
        ref: referenceNumber,
        url: `/?ref=${encodeURIComponent(referenceNumber)}&portal=track`,
      },
    });
  }

  /**
   * Subscribed grievances management in localStorage
   */
  static getSubscribedGrievances(): string[] {
    try {
      const data = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static isSubscribed(referenceNumber: string): boolean {
    const list = this.getSubscribedGrievances();
    return list.includes(referenceNumber.toUpperCase());
  }

  static subscribe(referenceNumber: string): void {
    const ref = referenceNumber.toUpperCase();
    const list = this.getSubscribedGrievances();
    if (!list.includes(ref)) {
      list.push(ref);
      try {
        localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to save subscription', e);
      }
    }
  }

  static unsubscribe(referenceNumber: string): void {
    const ref = referenceNumber.toUpperCase();
    const list = this.getSubscribedGrievances().filter((r) => r !== ref);
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to remove subscription', e);
    }
  }

  /**
   * Check if any subscribed complaint had its status changed and notify the citizen
   */
  static checkAndNotifyStatusUpdates(complaints: Array<{ referenceNumber: string; title: string; status: ComplaintStatus }>, lang: Language = 'ne') {
    const subscribed = this.getSubscribedGrievances();
    if (subscribed.length === 0) return;

    let lastKnown: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(LAST_KNOWN_STATUS_KEY);
      if (raw) lastKnown = JSON.parse(raw);
    } catch {}

    let hasChanges = false;

    for (const c of complaints) {
      const ref = c.referenceNumber.toUpperCase();
      if (subscribed.includes(ref)) {
        const prevStatus = lastKnown[ref];
        if (prevStatus && prevStatus !== c.status) {
          // Status has updated! Trigger notification
          this.notifyGrievanceStatusChange({
            referenceNumber: c.referenceNumber,
            title: c.title,
            newStatus: c.status,
            lang,
          });
        }
        lastKnown[ref] = c.status;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      try {
        localStorage.setItem(LAST_KNOWN_STATUS_KEY, JSON.stringify(lastKnown));
      } catch {}
    }
  }
}
