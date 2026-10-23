import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService, DEMO_STAFF_ID } from '../auth/auth.service';

export interface CounterBill {
  time: string;
  bill: string;
  item: string;
  amount: string;
  mode: string;
}

const OPENING_LEDGER: CounterBill[] = [
  { time: '10:18 AM', bill: 'TMB/2026/1045', item: 'Archana', amount: '₹ 150', mode: 'UPI' },
  { time: '09:52 AM', bill: 'TMB/2026/1044', item: 'Abhishekam', amount: '₹ 500', mode: 'Cash' },
  { time: '09:37 AM', bill: 'TMB/2026/1043', item: 'Hundi', amount: '₹ 1,000', mode: 'Cash' },
  { time: '09:12 AM', bill: 'TMB/2026/1042', item: 'Deepa Aradhana', amount: '₹ 250', mode: 'UPI' },
  { time: '08:45 AM', bill: 'TMB/2026/1041', item: 'Vazhipadu', amount: '₹ 1,000', mode: 'Card' },
];

export function visibleBills(staffId: string | null, own: readonly CounterBill[]): CounterBill[] {
  return staffId === DEMO_STAFF_ID ? [...own, ...OPENING_LEDGER] : [...own];
}

@Injectable({ providedIn: 'root' })
export class BillStore {
  private readonly auth = inject(AuthService);
  private readonly revision = signal(0);
  private readonly cache = new Map<string, CounterBill[]>();
  readonly bills = computed(() => {
    this.revision();
    const staffId = this.auth.user();
    return staffId ? [...this.load(staffId)] : [];
  });

  add(bill: CounterBill): void {
    const staffId = this.auth.user();
    if (!staffId) {
      return;
    }
    const next = [bill, ...this.load(staffId)];
    this.cache.set(staffId, next);
    this.write(staffId, next);
    this.revision.update((value) => value + 1);
  }

  private load(staffId: string): CounterBill[] {
    const cached = this.cache.get(staffId);
    if (cached) {
      return cached;
    }
    const read = this.read(staffId);
    this.cache.set(staffId, read);
    return read;
  }

  private read(staffId: string): CounterBill[] {
    try {
      const raw = localStorage.getItem(this.key(staffId));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as CounterBill[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(staffId: string, bills: CounterBill[]): void {
    try {
      localStorage.setItem(this.key(staffId), JSON.stringify(bills));
    } catch {
      // Ignore storage failures in private browsing.
    }
  }

  private key(staffId: string): string {
    return `temple-app-bills:${staffId}`;
  }
}
