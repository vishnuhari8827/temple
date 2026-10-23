import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth/auth.service';

export interface HistoryEntry {
  id: string;
  mobile: string;
  devotee: string;
  pooja: string;
  star: string;
  date: string;
  detail: string;
}

export interface BookingHistorySource {
  id: string;
  mobile: string;
  devotee: string;
  pooja: string;
  star: string;
  date: string;
  amount: string;
  paymentStatus: string;
}

@Injectable({ providedIn: 'root' })
export class VazhipaduHistory {
  private readonly auth = inject(AuthService);
  private readonly revision = signal(0);
  private readonly cache = new Map<string, HistoryEntry[]>();
  readonly rows = computed(() => {
    this.revision();
    const staffId = this.auth.user();
    return staffId ? [...this.load(staffId)] : [];
  });

  remember(entries: HistoryEntry[]): void {
    const staffId = this.auth.user();
    if (!staffId || !entries.length) {
      return;
    }
    const next = [...entries, ...this.load(staffId)];
    this.cache.set(staffId, next);
    this.write(staffId, next);
    this.revision.update((value) => value + 1);
  }

  private load(staffId: string): HistoryEntry[] {
    const cached = this.cache.get(staffId);
    if (cached) {
      return cached;
    }
    const read = this.read(staffId);
    this.cache.set(staffId, read);
    return read;
  }

  private read(staffId: string): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(this.key(staffId));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as HistoryEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(staffId: string, entries: HistoryEntry[]): void {
    try {
      localStorage.setItem(this.key(staffId), JSON.stringify(entries));
    } catch {
      // Ignore storage failures in private browsing.
    }
  }

  private key(staffId: string): string {
    return `temple-app-counter-history:${staffId}`;
  }
}

export function pastVazhipadu(
  mobile: string,
  bookings: BookingHistorySource[],
  counter: HistoryEntry[],
): HistoryEntry[] {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length !== 10) {
    return [];
  }
  const fromBookings = bookings
    .filter((item) => item.mobile.replace(/\D/g, '') === digits)
    .map((item) => ({
      id: item.id,
      mobile: digits,
      devotee: item.devotee,
      pooja: item.pooja,
      star: item.star,
      date: item.date,
      detail: `${item.amount} · ${item.paymentStatus === 'Advance' ? 'Advance paid' : item.paymentStatus}`,
    }));
  const fromCounter = counter.filter((item) => item.mobile === digits);
  return [...fromCounter, ...fromBookings].sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

function dateValue(value: string): number {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
