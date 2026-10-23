import { Injectable, signal } from '@angular/core';
import { CounterId } from './work-options';

const STORAGE_KEY = 'temple-app-session';

const STAFF = [
  { id: 'ST1001', password: 'darshan' },
  { id: 'ST1002', password: 'nilavilakku' },
] as const;

export const DEMO_STAFF_ID = STAFF[0].id;
export const DEMO_PASSWORD = STAFF[0].password;

interface Session {
  staffId: string;
  counter: CounterId;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(this.readSession());
  readonly user = signal<string | null>(this.session()?.staffId ?? null);
  readonly counter = signal<CounterId | null>(this.session()?.counter ?? null);

  login(staffId: string, password: string, remember: boolean, counter: CounterId): boolean {
    const normalized = staffId.trim().toUpperCase();
    const staff = STAFF.find((item) => item.id === normalized);
    if (!staff || staff.password !== password) {
      return false;
    }

    const next = { staffId: normalized, counter };
    this.writeSession(next, remember);
    this.session.set(next);
    this.user.set(normalized);
    this.counter.set(counter);
    return true;
  }

  logout(): void {
    this.clearSession();
    this.session.set(null);
    this.user.set(null);
    this.counter.set(null);
  }

  isAuthenticated(): boolean {
    return this.user() !== null;
  }

  private readSession(): Session | null {
    const raw = this.read(localStorage) ?? this.read(sessionStorage);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Session;
      if (
        STAFF.some((staff) => staff.id === parsed.staffId) &&
        (parsed.counter === 'counter-1' || parsed.counter === 'counter-2')
      ) {
        return { staffId: parsed.staffId, counter: parsed.counter };
      }
    } catch {
      return null;
    }
    return null;
  }

  private writeSession(session: Session, remember: boolean): void {
    this.clearSession();
    this.write(remember ? localStorage : sessionStorage, JSON.stringify(session));
  }

  private clearSession(): void {
    this.remove(localStorage);
    this.remove(sessionStorage);
  }

  private read(storage: Storage): string | null {
    try {
      return storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(storage: Storage, value: string): void {
    try {
      storage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore storage failures in private browsing.
    }
  }

  private remove(storage: Storage): void {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures in private browsing.
    }
  }
}
