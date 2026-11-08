/**
 * Date and Time utilities for Asia/Kathmandu (Nepal Standard Time, UTC+5:45)
 * Guarantees automated, accurate Nepal Standard Time (NPT) for screens and printable PDF bills.
 */

const NEPAL_OFFSET_MINUTES = 345; // 5 hours 45 minutes

/**
 * Returns a Date object shifted to Nepal Standard Time
 */
export function getNepalDate(utcIsoString?: string): Date {
  const baseDate = utcIsoString ? new Date(utcIsoString) : new Date();
  const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  // Calculate UTC milliseconds then add Nepal's offset (+5:45)
  const utcMs = validDate.getTime() + validDate.getTimezoneOffset() * 60000;
  return new Date(utcMs + NEPAL_OFFSET_MINUTES * 60000);
}

/**
 * Format date & time for PDF bills (strictly ASCII/Latin characters so jsPDF fonts render cleanly without garbled glyphs)
 * Output example: "08 Nov 2026, 02:45 PM (NPT / UTC+5:45)"
 */
export function formatPdfNepalDateTime(utcIsoString?: string): string {
  try {
    const baseDate = utcIsoString ? new Date(utcIsoString) : new Date();
    const date = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return `${formatter.format(date)} (NPT / UTC+5:45)`;
  } catch {
    const d = getNepalDate(utcIsoString);
    return `${d.toISOString().replace('T', ' ').substring(0, 19)} NPT`;
  }
}

/**
 * Format date and time for web UI (Nepal Standard Time with clear bilingual display)
 */
export function formatNepalDateTime(utcIsoString?: string, lang: 'ne' | 'en' | 'mai' = 'ne'): string {
  try {
    const baseDate = utcIsoString ? new Date(utcIsoString) : new Date();
    const date = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    // Use en-US or ne-NP with explicit Asia/Kathmandu timezone
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
    return formatPdfNepalDateTime(utcIsoString);
  }
}

export function formatNepalDateOnly(utcIsoString?: string, lang: 'ne' | 'en' | 'mai' = 'ne'): string {
  try {
    const baseDate = utcIsoString ? new Date(utcIsoString) : new Date();
    const date = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const locale = lang === 'en' ? 'en-US' : 'ne-NP';
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return utcIsoString || new Date().toISOString().substring(0, 10);
  }
}

export function getTodayNepalDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function getCurrentNepalTimeFormatted(): string {
  return formatPdfNepalDateTime(new Date().toISOString());
}

export function generateReferenceNumber(): string {
  const year = 2026;
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
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
