import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService, DEMO_STAFF_ID } from '../auth/auth.service';

export interface FamilyMember {
  name: string;
  relation: string;
  star: string;
}

export interface DevoteeRecord {
  mobile: string;
  name: string;
  star: string;
  family: FamilyMember[];
}

const LEGACY_KEY = 'temple-app-devotees';

const SEED: DevoteeRecord[] = [
  {
    mobile: '9847012345',
    name: 'Meena',
    star: 'Rohini',
    family: [
      { name: 'Ravi', relation: 'Husband', star: 'Makam' },
      { name: 'Anu', relation: 'Daughter', star: 'Pooram' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class DevoteeDirectory {
  private readonly auth = inject(AuthService);
  private readonly revision = signal(0);
  private readonly cache = new Map<string, DevoteeRecord[]>();
  private readonly records = computed(() => {
    this.revision();
    const staffId = this.auth.user();
    return staffId ? this.load(staffId) : [];
  });

  find(mobile: string): DevoteeRecord | null {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      return null;
    }
    return this.records().find((record) => record.mobile === digits) ?? null;
  }

  save(record: DevoteeRecord): void {
    const staffId = this.auth.user();
    if (!staffId) {
      return;
    }
    const next = [record, ...this.load(staffId).filter((item) => item.mobile !== record.mobile)];
    this.cache.set(staffId, next);
    this.write(staffId, next);
    this.revision.update((value) => value + 1);
  }

  private load(staffId: string): DevoteeRecord[] {
    const cached = this.cache.get(staffId);
    if (cached) {
      return cached;
    }
    const read = this.read(staffId);
    this.cache.set(staffId, read);
    return read;
  }

  private read(staffId: string): DevoteeRecord[] {
    const own = this.parse(this.stored(this.key(staffId)));
    if (own) {
      return own;
    }
    if (staffId === DEMO_STAFF_ID) {
      const legacy = this.parse(this.stored(LEGACY_KEY));
      if (legacy) {
        this.write(staffId, legacy);
        return legacy;
      }
    }
    return SEED.map((record) => ({ ...record, family: record.family.map((member) => ({ ...member })) }));
  }

  private stored(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private parse(raw: string | null): DevoteeRecord[] | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as DevoteeRecord[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private write(staffId: string, records: DevoteeRecord[]): void {
    try {
      localStorage.setItem(this.key(staffId), JSON.stringify(records));
    } catch {
      // Ignore storage failures in private browsing.
    }
  }

  private key(staffId: string): string {
    return `temple-app-devotees:${staffId}`;
  }
}
