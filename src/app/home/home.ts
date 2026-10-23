import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { counterLabel } from '../auth/work-options';
import { Billing } from '../billing/billing';
import { BillStore, visibleBills } from '../billing/bill-store';
import { panchangamFor } from '../panchangam';
import { BookingStore, MAIN_POOJAS, PoojaBooking } from '../pooja/pooja-booking';

type SectionId = 'home' | 'billing' | 'pooja' | 'donations' | 'history' | 'report';

const NAV: { id: SectionId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'billing', label: 'New Billing' },
  { id: 'pooja', label: 'Pooja Booking' },
  { id: 'donations', label: 'Donations' },
  { id: 'history', label: 'Transaction History' },
  { id: 'report', label: 'Daily Report' },
];

const RITUALS = [
  { time: '4:30 AM', title: 'Nada thurakkal', detail: 'Temple opens' },
  { time: '5:00 AM', title: 'Nirmalyam', detail: 'Morning offering' },
  { time: '6:30 AM', title: 'Abhishekam', detail: 'Usha abhishekam' },
  { time: '7:30 AM', title: 'Usha pooja', detail: 'Archana begins after the pooja' },
  { time: '9:30 AM', title: 'Ucha pooja', detail: 'Nada closes after uchi' },
  { time: '5:00 PM', title: 'Nada thurakkal', detail: 'Evening opening' },
  { time: '6:00 PM', title: 'Deeparadhana', detail: 'Evening lamp offering' },
  { time: '7:00 PM', title: 'Athazha pooja', detail: 'Night pooja' },
  { time: '8:00 PM', title: 'Nada adaykkal', detail: 'Temple closes' },
];

@Component({
  selector: 'app-home',
  imports: [Billing, PoojaBooking],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly bills = inject(BillStore);
  private readonly bookings = inject(BookingStore);
  private clock: ReturnType<typeof setInterval> | undefined;

  protected readonly nav = NAV;
  protected readonly transactions = computed(() => visibleBills(this.auth.user(), this.bills.bills()));
  protected readonly summary = computed(() => {
    const rows = this.transactions();
    const collection = rows.reduce((sum, row) => sum + this.amountValue(row.amount), 0);
    const donations = rows
      .filter((row) => /hundi|donation/i.test(row.item))
      .reduce((sum, row) => sum + this.amountValue(row.amount), 0);
    return [
      { id: 'bills', label: 'Total Bills', value: String(rows.length) },
      { id: 'collection', label: 'Total Collection', value: this.rupees(collection) },
      { id: 'donations', label: 'Donations', value: this.rupees(donations) },
      { id: 'pooja', label: 'Pooja Bookings', value: String(this.bookings.bookings().length) },
    ];
  });
  protected readonly now = signal(new Date());
  protected readonly panchangam = computed(() => panchangamFor(this.now()));
  protected readonly schedule = computed(() => this.daySchedule());
  protected readonly todayBookings = computed(() => this.bookedToday(this.now()));
  protected readonly mainPoojas = computed(() => this.mainTemplePoojas(this.now()));
  protected readonly events = computed(() => this.comingEvents(this.now()));
  protected readonly advanceBookings = computed(() => this.upcomingBookings(this.now()));
  protected readonly reminders = computed(() => this.dayReminders(this.now()));
  protected readonly section = signal<SectionId>('home');
  protected readonly staffId = this.auth.user;
  protected readonly counterText = () => counterLabel(this.auth.counter());

  constructor() {
    inject(Title).setTitle('Counter · ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം, അവനവൻചേരി');
    this.clock = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(this.clock));
  }

  protected greeting(): string {
    const hour = this.now().getHours();
    return hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  protected longDate(): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.now());
  }

  protected clockDate(): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(this.now());
  }

  protected clockTime(): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(this.now());
  }

  protected open(id: SectionId): void {
    this.section.set(id);
    document.querySelector('.content')?.scrollIntoView({ block: 'start' });
  }

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private amountValue(amount: string): number {
    return Number(amount.replace(/[^\d.]/g, '')) || 0;
  }

  private rupees(value: number): string {
    return `₹ ${value.toLocaleString('en-IN')}`;
  }

  private daySchedule() {
    return RITUALS;
  }

  private bookedToday(date: Date) {
    return this.bookings
      .bookings()
      .filter((item) => this.sameDay(this.parseDay(item.date), date) && !this.isMainPooja(item.pooja))
      .sort((a, b) => this.minutes(a.time) - this.minutes(b.time))
      .map((item) => ({
        id: item.id,
        pooja: item.pooja,
        devotee: item.devotee,
        nakshatra: item.star,
        time: item.time,
        section: this.poojaSection(item.time),
        payment: this.paymentLabel(item.paymentStatus),
        status: item.paymentStatus.toLowerCase(),
      }));
  }

  private mainTemplePoojas(date: Date) {
    return this.bookings
      .bookings()
      .filter((item) => this.isMainPooja(item.pooja) && this.sameDay(this.parseDay(item.date), date))
      .sort((a, b) => this.minutes(a.time) - this.minutes(b.time))
      .map((item) => ({
        id: item.id,
        pooja: item.pooja,
        devotee: item.devotee,
        nakshatra: item.star,
        contact: item.mobile,
        time: item.time,
        payment: this.paymentLabel(item.paymentStatus),
        status: item.paymentStatus.toLowerCase(),
      }));
  }

  private isMainPooja(name: string): boolean {
    return (MAIN_POOJAS as readonly string[]).includes(name);
  }

  private poojaSection(time: string): string {
    const minute = this.minutes(time);
    if (minute < this.minutes('9:30 AM')) {
      return 'Usha pooja';
    }
    if (minute < this.minutes('5:00 PM')) {
      return 'Ucha pooja';
    }
    return 'Athazha pooja';
  }

  private paymentLabel(status: string): string {
    if (status === 'Advance') {
      return 'Advance payment paid';
    }
    if (status === 'Paid') {
      return 'Paid';
    }
    return 'Unpaid';
  }

  private comingEvents(date: Date) {
    const events: { when: string; title: string }[] = [];
    for (let offset = 1; offset <= 14 && events.length < 4; offset += 1) {
      const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
      const day = panchangamFor(next);
      const marks = day.specialities.filter((item) => item !== 'സാധാരണ ദിവസം');
      if (!marks.length) {
        continue;
      }
      events.push({
        when: `${day.month} ${day.day} · ${this.shortDate(next)}`,
        title: marks.join(' · '),
      });
    }
    return events;
  }

  private upcomingBookings(date: Date) {
    const today = this.startOfDay(date).getTime();
    return this.bookings
      .bookings()
      .filter((item) => this.parseDay(item.date).getTime() > today)
      .sort((a, b) => this.parseDay(a.date).getTime() - this.parseDay(b.date).getTime() || this.minutes(a.time) - this.minutes(b.time))
      .slice(0, 6);
  }

  private dayReminders(date: Date) {
    const notes: string[] = [];
    const today = panchangamFor(date);
    const marks = today.specialities.filter((item) => item !== 'സാധാരണ ദിവസം');
    if (marks.length) {
      notes.push(`Prepare for ${marks.join(', ')}.`);
    }
    const soon = this.startOfDay(date).getTime() + 2 * 86400000;
    for (const item of this.bookings.bookings()) {
      const when = this.parseDay(item.date).getTime();
      if (item.paymentStatus === 'Advance' && item.balance && when >= this.startOfDay(date).getTime()) {
        notes.push(`Collect ${item.balance} balance for ${item.devotee}'s ${item.pooja} on ${item.date}.`);
      }
      if (item.paymentStatus === 'Unpaid' && when >= this.startOfDay(date).getTime() && when <= soon) {
        notes.push(`${item.devotee}'s ${item.pooja} on ${item.date} is still unpaid.`);
      }
    }
    return notes.length ? notes : ['No pending reminders for today.'];
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private sameDay(left: Date, right: Date): boolean {
    return this.startOfDay(left).getTime() === this.startOfDay(right).getTime();
  }

  private parseDay(value: string): Date {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? this.startOfDay(this.now()) : parsed;
  }

  private shortDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
  }

  private minutes(value: string): number {
    const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) {
      return 0;
    }
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') {
      hour += 12;
    }
    return hour * 60 + Number(match[2]);
  }
}
