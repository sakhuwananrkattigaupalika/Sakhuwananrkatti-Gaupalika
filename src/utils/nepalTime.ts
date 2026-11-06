/**
 * Date and Time utilities for Asia/Kathmandu (Nepal Standard Time, UTC+5:45)
 * Strict UTC storage and Asia/Kathmandu rendering.
 */

export function formatNepalDateTime(utcIsoString: string, lang: 'ne' | 'en' | 'mai' = 'ne'): string {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;

    // Options for Asia/Kathmandu timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };

    const locale = lang === 'en' ? 'en-US' : 'ne-NP';
    const formatted = new Intl.DateTimeFormat(locale, options).format(date);
    return `${formatted} (NPT)`;
  } catch {
    return utcIsoString;
  }
}

export function formatNepalDateOnly(utcIsoString: string, lang: 'ne' | 'en' | 'mai' = 'ne'): string {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const locale = lang === 'en' ? 'en-US' : 'ne-NP';
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return utcIsoString;
  }
}

export function getTodayNepalDateString(): string {
  // Returns YYYY-MM-DD in Asia/Kathmandu
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function generateReferenceNumber(): string {
  // Format: SKK-2026-XXXXXX (cryptographically random alphanumeric, collision resistant)
  const year = 2026;
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 exclude ambiguous 0,O,1,I
  const array = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 6; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars[array[i] % chars.length];
  }
  return `SKK-${year}-${randomPart}`;
}

export function generateAppointmentRef(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `APT-2026-${rand}`;
}
