import { Component, Injectable, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { counterLabel } from '../auth/work-options';
import { panchangamFor } from '../panchangam';
import { pastVazhipadu, VazhipaduHistory } from '../vazhipadu-history';

const VAZHIPADS = [
  { name: 'Archana', price: 150 },
  { name: 'Abhishekam', price: 500 },
  { name: 'Deepa Aradhana', price: 250 },
  { name: 'Vazhipadu', price: 1000 },
  { name: 'Neyvilakku', price: 100 },
  { name: 'Pushpanjali', price: 50 },
  { name: 'Palpayasam', price: 200 },
  { name: 'Ayilya pooja', price: 250 },
  { name: 'Udayapooja', price: 2500 },
  { name: 'Chuttuvilakku', price: 1500 },
  { name: 'Valsan', price: 2000 },
] as const;

export const MAIN_POOJAS = ['Udayapooja', 'Chuttuvilakku', 'Valsan'] as const;

const SHARED_SHARE = 200;
const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Advance'] as const;
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type OfferingKind = 'Individual' | 'Shared';

interface Participant {
  name: string;
  star: string;
}

interface PersonDraft {
  bookingId: string;
  index: number;
  name: string;
  star: string;
  offeringName: string;
}

interface SlipRow {
  member: string;
  star: string;
  devotee: string;
  vazhipadu: string;
  when: string;
  bookingId: string;
  amount: number;
  status: string;
  balance: string;
  note: string;
}

interface Slip {
  heading: string;
  rows: SlipRow[];
}

interface AlmanacCell {
  iso: string;
  civil: number;
  month: string;
  line: string;
  nakshatra: string;
  marks: string;
  special: boolean;
  outside: boolean;
  today: boolean;
  label: string;
}

export interface Booking {
  id: string;
  devotee: string;
  mobile: string;
  star: string;
  pooja: string;
  offeringName: string;
  kind: OfferingKind;
  participants: Participant[];
  shareValue: number;
  amountValue: number;
  advanceValue: number;
  date: string;
  time: string;
  amount: string;
  payment: string;
  paymentStatus: PaymentStatus;
  advance: string;
  balance: string;
}

type ShareGroup = FormGroup<{
  name: FormControl<string>;
  star: FormControl<string>;
}>;

const STARS = [
  'Ashwathi',
  'Bharani',
  'Karthika',
  'Rohini',
  'Makayiram',
  'Thiruvathira',
  'Punartham',
  'Pooyam',
  'Ayilyam',
  'Makam',
  'Pooram',
  'Uthram',
  'Atham',
  'Chithira',
  'Chothi',
  'Visakham',
  'Anizham',
  'Thrikketta',
  'Moolam',
  'Pooradam',
  'Uthradam',
  'Thiruvonam',
  'Avittam',
  'Chathayam',
  'Pooruruttathi',
  'Uthrattathi',
  'Revathi',
];

const BOOKINGS: Booking[] = [
  booking('APB/2026/213', 'Anil', '94470 14455', 'Makam', 'Archana', '21 Oct 2026', '8:00 AM', 150, 'Cash', 'Paid'),
  booking('APB/2026/218', 'Meena', '98470 12345', 'Rohini', 'Archana', '26 Oct 2026', '8:30 AM', 150, 'UPI', 'Advance', 50),
  booking('APB/2026/210', 'Lakshmi', '98470 11122', 'Rohini', 'Abhishekam', '18 Oct 2026', '6:30 AM', 500, 'Cash', 'Paid'),
  booking('APB/2026/219', 'Gopi', '96330 17788', 'Thiruvathira', 'Abhishekam', '27 Oct 2026', '6:30 AM', 500, '', 'Unpaid'),
  booking('APB/2026/212', 'Sreeja', '97451 23344', 'Pooram', 'Deepa Aradhana', '20 Oct 2026', '6:00 PM', 250, '', 'Unpaid'),
  booking('APB/2026/211', 'Rajan', '98950 12233', 'Thiruvonam', 'Vazhipadu', '19 Oct 2026', '7:00 AM', 1000, 'UPI', 'Paid'),
  booking('APB/2026/220', 'Sindhu', '94960 18899', 'Chothi', 'Vazhipadu', '28 Oct 2026', '7:15 AM', 1000, 'Card', 'Advance', 400),
  booking('APB/2026/217', 'Unni', '98470 22110', 'Thiruvonam', 'Vazhipadu', '24 Oct 2026', '7:30 AM', 600, 'Cash', 'Paid', 0, {
    kind: 'Shared',
    share: SHARED_SHARE,
    participants: [
      { name: 'Unni', star: 'Thiruvonam' },
      { name: 'Leela', star: 'Rohini' },
      { name: 'Arun', star: 'Makam' },
    ],
  }),
  booking('APB/2026/215', 'Mohan', '99950 16677', 'Uthram', 'Neyvilakku', '25 Oct 2026', '6:15 PM', 100, '', 'Unpaid'),
  booking('APB/2026/216', 'Radha', '90720 19900', 'Bharani', 'Pushpanjali', '23 Oct 2026', '9:00 AM', 50, 'Cash', 'Paid'),
  booking('APB/2026/214', 'Devika', '80890 15566', 'Atham', 'Palpayasam', '22 Oct 2026', '10:30 AM', 200, 'Card', 'Advance', 100),
  booking('APB/2026/221', 'Lakshmi', '98470 11122', 'Rohini', 'Udayapooja', '19 Oct 2026', '6:30 AM', 2500, 'Cash', 'Paid'),
  booking('APB/2026/222', 'Sreeja', '97451 23344', 'Pooram', 'Chuttuvilakku', '19 Oct 2026', '6:15 PM', 1500, 'UPI', 'Advance', 500),
  booking('APB/2026/223', 'Gopi', '96330 17788', 'Thiruvathira', 'Valsan', '19 Oct 2026', '7:00 PM', 2000, '', 'Unpaid'),
];

const AYILYA_LIST: { devotee: string; star: string; mobile: string; payment: string; status: PaymentStatus; advance?: number }[] = [
  { devotee: 'Ammini', star: 'Rohini', mobile: '98471 10001', payment: 'Cash', status: 'Paid' },
  { devotee: 'Balan', star: 'Bharani', mobile: '98471 10002', payment: 'UPI', status: 'Paid' },
  { devotee: 'Chandran', star: 'Karthika', mobile: '98471 10003', payment: 'Card', status: 'Advance', advance: 100 },
  { devotee: 'Devi', star: 'Makam', mobile: '98471 10004', payment: 'Cash', status: 'Paid' },
  { devotee: 'Easwaran', star: 'Thiruvonam', mobile: '98471 10005', payment: 'UPI', status: 'Paid' },
  { devotee: 'Girija', star: 'Pooram', mobile: '98471 10006', payment: '', status: 'Unpaid' },
  { devotee: 'Haridasan', star: 'Uthram', mobile: '98471 10007', payment: 'Cash', status: 'Paid' },
  { devotee: 'Indira', star: 'Atham', mobile: '98471 10008', payment: 'UPI', status: 'Paid' },
  { devotee: 'Janaki', star: 'Chothi', mobile: '98471 10009', payment: 'Cash', status: 'Advance', advance: 150 },
  { devotee: 'Krishnan', star: 'Avittam', mobile: '98471 10010', payment: 'Card', status: 'Paid' },
  { devotee: 'Lalitha', star: 'Revathi', mobile: '98471 10011', payment: 'Cash', status: 'Paid' },
  { devotee: 'Madhavan', star: 'Punartham', mobile: '98471 10012', payment: 'UPI', status: 'Paid' },
  { devotee: 'Nalini', star: 'Pooyam', mobile: '98471 10013', payment: 'Cash', status: 'Paid' },
  { devotee: 'Omanakuttan', star: 'Makayiram', mobile: '98471 10014', payment: '', status: 'Unpaid' },
  { devotee: 'Parvathi', star: 'Visakham', mobile: '98471 10015', payment: 'UPI', status: 'Paid' },
  { devotee: 'Raman', star: 'Chithira', mobile: '98471 10016', payment: 'Cash', status: 'Paid' },
  { devotee: 'Sarojini', star: 'Anizham', mobile: '98471 10017', payment: 'UPI', status: 'Advance', advance: 50 },
  { devotee: 'Thankamani', star: 'Thrikketta', mobile: '98471 10018', payment: 'Cash', status: 'Paid' },
  { devotee: 'Unnikrishnan', star: 'Moolam', mobile: '98471 10019', payment: 'Card', status: 'Paid' },
  { devotee: 'Valsala', star: 'Pooradam', mobile: '98471 10020', payment: 'UPI', status: 'Paid' },
  { devotee: 'Achuthan', star: 'Uthradam', mobile: '98471 10021', payment: 'Cash', status: 'Paid' },
  { devotee: 'Yamuna', star: 'Ashwathi', mobile: '98471 10022', payment: 'UPI', status: 'Paid' },
  { devotee: 'Bhaskaran', star: 'Chathayam', mobile: '98471 10023', payment: 'Cash', status: 'Paid' },
  { devotee: 'Kamalakshi', star: 'Pooruruttathi', mobile: '98471 10024', payment: 'UPI', status: 'Paid' },
  { devotee: 'Narayanan', star: 'Uthrattathi', mobile: '98471 10025', payment: 'Cash', status: 'Paid' },
  { devotee: 'Sumathi', star: 'Thiruvathira', mobile: '98471 10026', payment: 'UPI', status: 'Paid' },
];

function ayilyaBookings(): Booking[] {
  return AYILYA_LIST.map((item, index) =>
    booking(
      `APB/2026/${224 + index}`,
      item.devotee,
      item.mobile,
      item.star,
      'Ayilya pooja',
      '25 Oct 2026',
      '10:00 AM',
      250,
      item.payment,
      item.status,
      item.advance ?? 0,
    ),
  );
}

BOOKINGS.push(...ayilyaBookings());

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function buildCalendar(cursor: Date): AlmanacCell[] {
  const month = cursor.getMonth();
  const first = new Date(cursor.getFullYear(), month, 1);
  const start = new Date(cursor.getFullYear(), month, 1 - first.getDay());
  const today = isoDate(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const day = panchangamFor(date);
    const marks = day.specialities.filter((item) => item !== 'സാധാരണ ദിവസം');
    return {
      iso: isoDate(date),
      civil: date.getDate(),
      month: day.month,
      line: `${day.month} ${day.day}`,
      nakshatra: day.nakshatra,
      marks: marks.join(' · '),
      special: marks.length > 0,
      outside: date.getMonth() !== month,
      today: isoDate(date) === today,
      label: `${date.getDate()} ${day.month} ${day.day}, ${day.nakshatra}${marks.length ? `, ${marks.join(', ')}` : ''}`,
    };
  });
}

function money(value: number): string {
  return `₹ ${value.toLocaleString('en-IN')}`;
}

function phone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : value.trim();
}

function booking(
  id: string,
  devotee: string,
  mobile: string,
  star: string,
  pooja: string,
  date: string,
  time: string,
  amount: number,
  payment: string,
  paymentStatus: PaymentStatus,
  advance = 0,
  extra?: { kind?: OfferingKind; participants?: Participant[]; share?: number },
): Booking {
  const participants = extra?.participants ?? [];
  const kind = extra?.kind ?? 'Individual';
  const advanceValue = paymentStatus === 'Advance' ? advance : 0;
  return {
    id,
    devotee,
    mobile,
    star,
    pooja,
    offeringName: participants.length ? participants.map((person) => person.name).join(', ') : devotee,
    kind,
    participants,
    shareValue: extra?.share ?? 0,
    amountValue: amount,
    advanceValue,
    date,
    time,
    amount: money(amount),
    payment: payment || '—',
    paymentStatus,
    advance: paymentStatus === 'Advance' ? money(advanceValue) : '',
    balance: paymentStatus === 'Advance' ? money(amount - advanceValue) : '',
  };
}

const BOOKING_KEY = 'temple-app-bookings';

@Injectable({ providedIn: 'root' })
export class BookingStore {
  private readonly saved = signal<Booking[]>(this.read());
  readonly bookings = this.saved.asReadonly();

  update(mutator: (items: Booking[]) => Booking[]): void {
    this.saved.update(mutator);
    this.write(this.saved());
  }

  private read(): Booking[] {
    try {
      const raw = localStorage.getItem(BOOKING_KEY);
      if (!raw) {
        this.write(BOOKINGS);
        return BOOKINGS;
      }
      const parsed = JSON.parse(raw) as Booking[];
      return Array.isArray(parsed) ? parsed : BOOKINGS;
    } catch {
      return BOOKINGS;
    }
  }

  private write(items: Booking[]): void {
    try {
      localStorage.setItem(BOOKING_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage failures in private browsing.
    }
  }
}

@Component({
  selector: 'app-pooja-booking',
  imports: [ReactiveFormsModule],
  templateUrl: './pooja-booking.html',
  styleUrl: './pooja-booking.css',
})
export class PoojaBooking {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly bookingStore = inject(BookingStore);
  private readonly bookings = this.bookingStore.bookings;
  private readonly counterHistory = inject(VazhipaduHistory);

  protected readonly counterText = () => counterLabel(this.auth.counter());
  protected readonly vazhipads = VAZHIPADS;
  protected readonly stars = STARS;
  protected readonly paymentStatuses = PAYMENT_STATUSES;
  protected readonly modes = ['Cash', 'UPI', 'Card'];
  protected readonly weekdays = ['ഞാ', 'തി', 'ചൊ', 'ബു', 'വ്യാ', 'വെ', 'ശ'];
  protected readonly monthCursor = signal(monthStart(new Date()));
  protected readonly chosenDate = signal('');
  protected readonly historyPhone = signal('');
  protected readonly vazhipaduHistory = computed(() =>
    pastVazhipadu(this.historyPhone(), this.bookings(), this.counterHistory.rows()),
  );
  protected readonly selectedDay = signal(isoDate(new Date()));
  protected readonly selectedPooja = signal('');
  protected readonly query = signal('');
  protected readonly poojaFilter = signal('');
  protected readonly timeFilter = signal('');
  protected readonly statusFilter = signal('');
  protected readonly pendingOnly = signal(false);
  protected readonly dayBookings = computed(() => {
    const iso = this.selectedDay();
    return this.bookings().filter((item) => this.bookingIso(item.date) === iso);
  });
  protected readonly filteredBookings = computed(() => this.dayBookings().filter((item) => this.matchesFilters(item)));
  protected readonly pendingCount = computed(() => this.dayBookings().filter((item) => this.balanceValue(item) > 0).length);
  protected readonly filtersOn = computed(
    () =>
      !!this.query().trim() ||
      !!this.poojaFilter() ||
      !!this.timeFilter() ||
      !!this.statusFilter() ||
      this.pendingOnly(),
  );
  protected readonly poojaChoices = computed(() =>
    [...new Set(this.dayBookings().map((item) => item.pooja))].sort((a, b) => a.localeCompare(b)),
  );
  protected readonly timeChoices = computed(() => {
    const pooja = this.poojaFilter();
    return [...new Set(this.dayBookings().filter((item) => !pooja || item.pooja === pooja).map((item) => item.time))].sort(
      (a, b) => this.minutes(a) - this.minutes(b),
    );
  });
  protected readonly dayRows = computed(() =>
    VAZHIPADS.map((vazhipad) => {
      const rows = this.filteredBookings().filter((item) => item.pooja === vazhipad.name);
      return {
        name: vazhipad.name,
        slot: this.slotLabel(rows),
        bookings: rows.length,
        devotees: rows.reduce((sum, item) => sum + this.devoteeCount(item), 0),
        total: rows.reduce((sum, item) => sum + item.amountValue, 0),
        paid: rows.reduce((sum, item) => sum + this.paidValue(item), 0),
        balance: rows.reduce((sum, item) => sum + this.balanceValue(item), 0),
      };
    })
      .filter((row) => row.bookings > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  protected readonly detailRows = computed(() => {
    const name = this.selectedPooja();
    if (!name) {
      return [];
    }
    return this.filteredBookings()
      .filter((item) => item.pooja === name)
      .sort((a, b) => this.minutes(a.time) - this.minutes(b.time) || a.devotee.localeCompare(b.devotee));
  });
  protected readonly dayTotal = computed(() => this.filteredBookings().length);
  protected readonly calendar = computed(() => buildCalendar(this.monthCursor()));
  protected readonly malayalamMonths = computed(() => {
    const names = this.calendar()
      .filter((cell) => !cell.outside)
      .map((cell) => cell.month);
    return [...new Set(names)].join(' · ');
  });
  protected readonly chosenDay = computed(() => {
    const iso = this.chosenDate();
    if (!iso) {
      return '';
    }
    const date = new Date(`${iso}T00:00:00`);
    const day = panchangamFor(date);
    const marks = day.specialities.filter((item) => item !== 'സാധാരണ ദിവസം');
    const civil = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    return `${civil} · ${day.month} ${day.day} · ${day.nakshatra}${marks.length ? ` · ${marks.join(' · ')}` : ''}`;
  });
  protected readonly bookingOpen = signal(false);
  protected readonly confirmed = signal<Booking | null>(null);
  protected readonly printError = signal('');
  protected readonly smsNote = signal<{ id: string; text: string } | null>(null);
  protected readonly submitted = signal(false);
  protected readonly balance = signal(0);
  protected readonly shareSummary = signal('');
  protected readonly shareTarget = signal<string | null>(null);
  protected readonly extraName = signal('');
  protected readonly extraStar = signal('');
  protected readonly extraError = signal('');
  protected readonly personDraft = signal<PersonDraft | null>(null);
  protected readonly personError = signal('');
  readonly closed = output<void>();

  protected readonly confirmedSlips = computed(() => {
    const saved = this.confirmed();
    if (!saved) {
      return [];
    }
    const mobile = saved.mobile.replace(/\D/g, '');
    return this.rowsFor(this.bookings().filter((item) => item.mobile.replace(/\D/g, '') === mobile));
  });

  protected readonly groups = computed(() => {
    const chosen = this.selectedPooja();
    const bookings = this.filteredBookings().filter((item) => item.pooja === chosen);
    return VAZHIPADS.map((vazhipad) => {
      const items = bookings.filter((item) => item.pooja === vazhipad.name);
      const sections =
        vazhipad.name === 'Vazhipadu'
          ? [
              { title: 'Individual', bookings: items.filter((item) => item.kind !== 'Shared') },
              { title: 'Shared', bookings: items.filter((item) => item.kind === 'Shared') },
            ]
          : [{ title: '', bookings: items }];
      return { name: vazhipad.name, sections };
    }).filter((group) => group.sections.some((section) => section.bookings.length > 0));
  });

  protected readonly form = this.fb.group({
    devotee: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    star: [''],
    pooja: ['', Validators.required],
    offeringKind: ['Individual' as OfferingKind],
    offeringName: [''],
    shares: this.fb.array<ShareGroup>([]),
    sharePrice: [SHARED_SHARE],
    date: ['', Validators.required],
    time: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentStatus: ['Paid' as PaymentStatus, Validators.required],
    advance: [0],
    payment: [''],
  });

  constructor() {
    this.form.controls.pooja.valueChanges.subscribe((name) => {
      const item = VAZHIPADS.find((vazhipad) => vazhipad.name === name);
      if (!item) {
        return;
      }
      if (name === 'Vazhipadu' && this.form.controls.offeringKind.value === 'Shared') {
        this.applyShareTotal();
        return;
      }
      this.form.controls.amount.setValue(item.price);
    });
    this.form.controls.offeringKind.valueChanges.subscribe(() => this.applyShareTotal());
    this.form.controls.sharePrice.valueChanges.subscribe(() => this.applyShareTotal());
    this.form.controls.shares.valueChanges.subscribe(() => this.applyShareTotal());
    this.form.valueChanges.subscribe(() => this.syncBalance());
    this.form.controls.date.valueChanges.subscribe((value) => this.chosenDate.set(value));
    this.form.controls.mobile.valueChanges.subscribe((value) => this.historyPhone.set(value.replace(/\D/g, '')));
  }

  protected monthTitle(): string {
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(this.monthCursor());
  }

  protected shiftMonth(step: number): void {
    const current = this.monthCursor();
    this.monthCursor.set(new Date(current.getFullYear(), current.getMonth() + step, 1));
  }

  protected pickDay(iso: string): void {
    this.form.controls.date.setValue(iso);
    this.form.controls.date.markAsTouched();
    const picked = new Date(`${iso}T00:00:00`);
    this.monthCursor.set(new Date(picked.getFullYear(), picked.getMonth(), 1));
  }

  protected get shares() {
    return this.form.controls.shares;
  }

  protected sharedOffering(): boolean {
    return this.form.controls.pooja.value === 'Vazhipadu' && this.form.controls.offeringKind.value === 'Shared';
  }

  protected statusLabel(status: PaymentStatus): string {
    if (status === 'Advance') return 'Advance paid';
    return status;
  }

  protected sendBalanceSms(item: Booking): void {
    const due = item.paymentStatus === 'Advance' ? item.balance : item.paymentStatus === 'Unpaid' ? item.amount : '';
    if (!due) {
      return;
    }
    const digits = item.mobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      this.smsNote.set({ id: item.id, text: 'A 10-digit mobile number is needed to send the balance SMS.' });
      return;
    }
    const text = `ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം, അവനവൻചേരി. Namaskaram ${item.devotee}. Balance ${due} is due for ${item.pooja} on ${item.date}. Please pay the remaining amount.`;
    const link = document.createElement('a');
    link.href = `sms:+91${digits}?body=${encodeURIComponent(text)}`;
    link.click();
    this.smsNote.set({ id: item.id, text: `Balance SMS opened for ${item.devotee} on ${item.mobile}.` });
  }

  protected formatMoney(value: number): string {
    return money(value);
  }

  protected selectToday(): void {
    this.chooseDay(isoDate(new Date()));
  }

  protected shiftDay(step: number): void {
    const current = new Date(`${this.selectedDay()}T00:00:00`);
    current.setDate(current.getDate() + step);
    this.chooseDay(isoDate(current));
  }

  protected selectDay(value: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      this.chooseDay(value);
    }
  }

  protected openDetails(name: string): void {
    this.selectedPooja.update((current) => (current === name ? '' : name));
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.keepDetails();
  }

  protected setPoojaFilter(value: string): void {
    this.poojaFilter.set(value);
    if (this.timeFilter() && !this.timeChoices().includes(this.timeFilter())) {
      this.timeFilter.set('');
    }
    this.keepDetails();
  }

  protected setTimeFilter(value: string): void {
    this.timeFilter.set(value);
    this.keepDetails();
  }

  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.keepDetails();
  }

  protected togglePending(): void {
    this.pendingOnly.update((on) => !on);
    this.keepDetails();
  }

  protected clearFilters(): void {
    this.query.set('');
    this.poojaFilter.set('');
    this.timeFilter.set('');
    this.statusFilter.set('');
    this.pendingOnly.set(false);
    this.selectedPooja.set('');
  }

  protected advancePaid(item: Booking): string {
    return item.paymentStatus === 'Advance' ? item.advance : money(0);
  }

  protected balanceDue(item: Booking): string {
    if (item.paymentStatus === 'Paid') {
      return money(0);
    }
    if (item.paymentStatus === 'Advance') {
      return item.balance;
    }
    return item.amount;
  }

  protected todayIso(): string {
    return isoDate(new Date());
  }

  protected dayTitle(): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${this.selectedDay()}T00:00:00`));
  }

  protected asText(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setKind(kind: OfferingKind): void {
    this.form.controls.offeringKind.setValue(kind);
    if (kind === 'Shared') {
      while (this.shares.length < 2) {
        this.shares.push(this.shareGroup());
      }
      const first = this.shares.at(0);
      if (first && !first.controls.name.value.trim()) {
        first.controls.name.setValue(this.form.controls.devotee.value);
        first.controls.star.setValue(this.form.controls.star.value);
      }
    }
    this.applyShareTotal();
  }

  protected addShareRow(): void {
    this.shares.push(this.shareGroup());
  }

  protected removeShareRow(index: number): void {
    if (this.shares.length <= 2) {
      return;
    }
    this.shares.removeAt(index);
  }

  protected editingPerson(bookingId: string, index: number): PersonDraft | null {
    const draft = this.personDraft();
    return draft && draft.bookingId === bookingId && draft.index === index ? draft : null;
  }

  protected beginPersonEdit(item: Booking, index: number): void {
    const person = index < 0 ? null : item.participants[index];
    this.personDraft.set({
      bookingId: item.id,
      index,
      name: person?.name ?? item.devotee,
      star: person?.star ?? item.star,
      offeringName: index < 0 ? item.offeringName : '',
    });
    this.personError.set('');
  }

  protected patchPersonDraft(field: 'name' | 'star' | 'offeringName', value: string): void {
    this.personDraft.update((draft) => (draft ? { ...draft, [field]: value } : draft));
  }

  protected cancelPersonEdit(): void {
    this.personDraft.set(null);
    this.personError.set('');
  }

  protected savePersonEdit(item: Booking): void {
    const draft = this.personDraft();
    if (!draft || draft.bookingId !== item.id) {
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      this.personError.set('Enter the member name.');
      return;
    }
    const next =
      draft.index < 0
        ? {
            ...item,
            devotee: name,
            star: draft.star,
            offeringName: draft.offeringName.trim() || name,
          }
        : this.renameParticipant(item, draft.index, name, draft.star);
    this.bookingStore.update((items) => items.map((booking) => (booking.id === item.id ? next : booking)));
    this.personDraft.set(null);
    this.personError.set('');
  }

  protected beginShare(id: string): void {
    this.shareTarget.set(id);
    this.extraName.set('');
    this.extraStar.set('');
    this.extraError.set('');
  }

  protected cancelShare(): void {
    this.shareTarget.set(null);
    this.extraError.set('');
  }

  protected confirmShare(item: Booking): void {
    const name = this.extraName().trim();
    if (!name) {
      this.extraError.set('Enter the name.');
      return;
    }
    const share = item.shareValue || SHARED_SHARE;
    const participants = [...item.participants, { name, star: this.extraStar() }];
    const amountValue = item.amountValue + share;
    const alreadyPaid = item.paymentStatus === 'Paid' ? item.amountValue : item.advanceValue;
    const paymentStatus: PaymentStatus =
      item.paymentStatus === 'Unpaid' ? 'Unpaid' : alreadyPaid < amountValue ? 'Advance' : item.paymentStatus;
    const advanceValue = paymentStatus === 'Advance' ? alreadyPaid : 0;
    const next = this.withPayment(
      {
        ...item,
        participants,
        offeringName: participants.map((person) => person.name).join(', '),
        shareValue: share,
        amountValue,
        advanceValue,
        paymentStatus,
      },
      amountValue,
      advanceValue,
      paymentStatus,
    );
    this.bookingStore.update((items) => items.map((booking) => (booking.id === item.id ? next : booking)));
    this.shareTarget.set(null);
  }

  protected openForm(): void {
    this.submitted.set(false);
    this.confirmed.set(null);
    this.printError.set('');
    this.balance.set(0);
    this.shareSummary.set('');
    this.shares.clear();
    this.monthCursor.set(monthStart(new Date()));
    this.chosenDate.set('');
    this.form.reset({
      devotee: '',
      mobile: '',
      star: '',
      pooja: '',
      offeringKind: 'Individual',
      offeringName: '',
      sharePrice: SHARED_SHARE,
      date: '',
      time: '',
      amount: 0,
      paymentStatus: 'Paid',
      advance: 0,
      payment: '',
    });
    this.bookingOpen.set(true);
  }

  protected closeForm(): void {
    this.bookingOpen.set(false);
  }

  protected errorFor(
    name: 'devotee' | 'mobile' | 'pooja' | 'date' | 'time' | 'amount' | 'advance' | 'payment' | 'shares' | 'sharePrice',
  ): string {
    if (!this.submitted()) {
      return '';
    }
    const value = this.form.getRawValue();
    const shared = value.pooja === 'Vazhipadu' && value.offeringKind === 'Shared';
    if (name === 'shares') {
      if (!shared) return '';
      const named = value.shares.filter((share) => share.name.trim()).length;
      return named >= 2 ? '' : 'Add at least two names for a shared vazhipadu.';
    }
    if (name === 'sharePrice') {
      if (!shared) return '';
      return Number(value.sharePrice) > 0 ? '' : 'Enter the share amount.';
    }
    if (name === 'advance') {
      if (value.paymentStatus !== 'Advance') return '';
      const advance = Number(value.advance) || 0;
      const amount = Number(value.amount) || 0;
      if (advance <= 0) return 'Enter the advance amount.';
      if (advance >= amount) return 'Advance must be less than the pooja amount.';
      return '';
    }
    if (name === 'payment') {
      if (value.paymentStatus === 'Unpaid' || value.payment) return '';
      return 'Select how the amount was received.';
    }
    const control = this.form.controls[name];
    if (!control.errors) return '';
    if (name === 'devotee') return 'Enter the devotee name.';
    if (name === 'mobile') return 'Enter a 10-digit mobile number.';
    if (name === 'pooja') return 'Select a vazhipad.';
    if (name === 'date') return 'Choose the pooja date.';
    if (name === 'time') return 'Choose the pooja time.';
    return 'Enter the pooja amount.';
  }

  protected save(): void {
    this.submitted.set(true);
    this.applyShareTotal();
    this.syncBalance();
    const blocking =
      this.errorFor('advance') || this.errorFor('payment') || this.errorFor('shares') || this.errorFor('sharePrice');
    if (this.form.invalid || blocking) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const shared = value.pooja === 'Vazhipadu' && value.offeringKind === 'Shared';
    const participants = shared
      ? value.shares
          .filter((share) => share.name.trim())
          .map((share) => ({ name: share.name.trim(), star: share.star }))
      : [];
    const amount = Number(value.amount) || 0;
    const advance = value.paymentStatus === 'Advance' ? Number(value.advance) || 0 : 0;
    const next = booking(
      this.nextId(),
      value.devotee.trim(),
      phone(value.mobile),
      value.star,
      value.pooja,
      this.formatDate(value.date),
      this.formatTime(value.time),
      amount,
      value.paymentStatus === 'Unpaid' ? '' : value.payment,
      value.paymentStatus,
      advance,
      shared
        ? { kind: 'Shared', participants, share: Number(value.sharePrice) || SHARED_SHARE }
        : { kind: 'Individual' },
    );
    if (!shared) {
      next.offeringName = value.offeringName.trim() || value.devotee.trim();
    }
    this.bookingStore.update((items) => [next, ...items]);
    this.bookingOpen.set(false);
    this.printError.set('');
    this.confirmed.set(next);
  }

  protected closeConfirmed(): void {
    this.confirmed.set(null);
    this.printError.set('');
  }

  protected printList(): void {
    const rows = this.detailRows();
    const pooja = this.selectedPooja();
    if (!pooja || !rows.length) {
      this.printError.set('There are no bookings to print.');
      return;
    }
    const total = rows.reduce((sum, item) => sum + item.amountValue, 0);
    const paid = rows.reduce((sum, item) => sum + this.paidValue(item), 0);
    const balance = rows.reduce((sum, item) => sum + this.balanceValue(item), 0);
    const body = rows
      .map(
        (item, index) => `<tr>
          <td>${index + 1}</td>
          <td>${this.escape(item.id)}</td>
          <td>${this.escape(item.devotee)}</td>
          <td>${this.escape(item.mobile)}</td>
          <td>${this.escape(item.star || '—')}</td>
          <td>${this.escape(item.time)}</td>
          <td>${this.escape(item.amount)}</td>
          <td>${this.escape(this.advancePaid(item))}</td>
          <td>${this.escape(this.balanceDue(item))}</td>
          <td>${this.escape(item.payment)}</td>
          <td>${this.escape(this.statusLabel(item.paymentStatus))}</td>
        </tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(pooja)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { margin: 0; color: #000; font-family: "Noto Serif Malayalam", "Segoe UI", sans-serif; }
        h1 { margin: 0; font-size: 20px; }
        h2 { margin: 8px 0 2px; font-size: 16px; }
        p { margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #ccc; text-align: left; padding: 4px 6px 4px 0; }
        tfoot td { font-weight: 700; border-bottom: 0; padding-top: 8px; }
      </style></head><body>
      <h1>ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം</h1>
      <p>അവനവൻചേരി</p>
      <h2>${this.escape(pooja)} · ${rows.length} ${rows.length === 1 ? 'booking' : 'bookings'}</h2>
      <p>${this.escape(this.dayTitle())}</p>
      <table>
        <thead><tr>
          <th>Sl.no.</th><th>Booking id</th><th>Devotee</th><th>Mobile</th><th>Nakshathra</th><th>Time</th>
          <th>Total</th><th>Advance</th><th>Balance</th><th>Payment</th><th>Status</th>
        </tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr>
          <td colspan="6">Total</td>
          <td>${this.escape(money(total))}</td>
          <td>${this.escape(money(paid))}</td>
          <td>${this.escape(money(balance))}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
      </body></html>`;
    this.printHtml(`${pooja} bookings`, html);
  }

  protected printAll(): void {
    const slips = this.confirmedSlips().map((row) => ({
      heading: `${row.vazhipadu} — ${row.member}`,
      rows: [row],
    }));
    this.sendToPrinter(slips, 'All slips');
  }

  protected printByMember(): void {
    this.sendToPrinter(
      this.groupSlips(
        this.confirmedSlips(),
        (row) => row.member.trim().toLowerCase(),
        (row) => row.member,
      ),
      'By member',
    );
  }

  protected printByVazhipadu(): void {
    this.sendToPrinter(
      this.groupSlips(
        this.confirmedSlips(),
        (row) => row.vazhipadu,
        (row) => row.vazhipadu,
      ),
      'By vazhipadu',
    );
  }

  private rowsFor(items: Booking[]): SlipRow[] {
    return items.flatMap((item) => {
      const shared = item.kind === 'Shared' && item.participants.length > 0;
      const people = shared
        ? item.participants
        : [{ name: item.offeringName || item.devotee, star: item.star }];
      const share = item.shareValue || Math.round(item.amountValue / Math.max(people.length, 1));
      return people
        .filter((person) => person.name.trim())
        .map((person) => ({
          member: person.name.trim(),
          star: person.star,
          devotee: item.devotee,
          vazhipadu: item.pooja,
          when: `${item.date} · ${item.time}`,
          bookingId: item.id,
          amount: shared ? share : item.amountValue,
          status: this.statusLabel(item.paymentStatus),
          balance: item.paymentStatus === 'Advance' ? item.balance : '',
          note: shared ? 'Shared' : '',
        }));
    });
  }

  private groupSlips(rows: SlipRow[], key: (row: SlipRow) => string, heading: (row: SlipRow) => string): Slip[] {
    const slips: Slip[] = [];
    const index = new Map<string, Slip>();
    for (const row of rows) {
      const id = key(row);
      const existing = index.get(id);
      if (existing) {
        existing.rows.push(row);
      } else {
        const slip = { heading: heading(row), rows: [row] };
        index.set(id, slip);
        slips.push(slip);
      }
    }
    return slips;
  }

  private sendToPrinter(slips: Slip[], title: string): void {
    if (!slips.length) {
      this.printError.set('There are no slips for this mobile number.');
      return;
    }
    this.printHtml(title, this.slipDocument(slips, title));
  }

  private printHtml(title: string, html: string): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', title);
    frame.style.position = 'fixed';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = '800px';
    frame.style.height = '1000px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      this.printError.set('Printing is unavailable in this browser.');
      return;
    }
    let printed = false;
    const run = () => {
      if (printed) {
        return;
      }
      printed = true;
      win.focus();
      win.print();
      setTimeout(() => frame.remove(), 1000);
    };
    frame.onload = run;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(run, 300);
    this.printError.set('');
  }

  private slipDocument(slips: Slip[], title: string): string {
    const saved = this.confirmed();
    const mobile = this.escape(saved?.mobile ?? '');
    const body = slips
      .map((slip) => {
        const total = slip.rows.reduce((sum, row) => sum + row.amount, 0);
        const rows = slip.rows
          .map(
            (row) => `<tr>
              <td>${this.escape(row.member)}${row.star ? ` (${this.escape(row.star)})` : ''}</td>
              <td>${this.escape(row.vazhipadu)}${row.note ? ` · ${this.escape(row.note)}` : ''}</td>
              <td>${this.escape(row.when)}</td>
              <td>${this.escape(row.bookingId)}</td>
              <td>${this.escape(row.status)}${row.balance ? `<br>Balance ${this.escape(row.balance)}` : ''}</td>
              <td>${this.escape(money(row.amount))}</td>
            </tr>`,
          )
          .join('');
        return `<article class="slip">
          <h1>ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം</h1>
          <p class="place">അവനവൻചേരി</p>
          <h2>${this.escape(slip.heading)}</h2>
          <p>Mobile ${mobile}</p>
          <table>
            <thead><tr><th>Member</th><th>Vazhipadu</th><th>When</th><th>Booking</th><th>Payment</th><th>Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="total">Total ${this.escape(money(total))}</p>
        </article>`;
      })
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(title)}</title>
      <style>
        body { margin: 16px; color: #000; font-family: "Noto Serif Malayalam", "Segoe UI", sans-serif; }
        h1 { margin: 0; font-size: 20px; }
        h2 { margin: 8px 0 4px; font-size: 16px; }
        p { margin: 0 0 6px; }
        .place { margin-bottom: 8px; }
        .slip { border: 1px solid #000; padding: 12px 14px; margin: 0 0 14px; break-inside: avoid; page-break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border-bottom: 1px solid #ccc; text-align: left; padding: 4px 6px 4px 0; vertical-align: top; }
        .total { font-weight: 700; margin-top: 8px; }
      </style></head><body>${body}</body></html>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renameParticipant(item: Booking, index: number, name: string, star: string): Booking {
    const participants = item.participants.map((person, position) =>
      position === index ? { name, star } : person,
    );
    return {
      ...item,
      participants,
      offeringName: participants.map((person) => person.name).join(', '),
      devotee: index === 0 ? name : item.devotee,
      star: index === 0 ? star : item.star,
    };
  }

  private shareGroup(): ShareGroup {
    return this.fb.group({
      name: [''],
      star: [''],
    });
  }

  private applyShareTotal(): void {
    const value = this.form.getRawValue();
    if (value.pooja !== 'Vazhipadu' || value.offeringKind !== 'Shared') {
      this.shareSummary.set('');
      return;
    }
    const named = value.shares.filter((share) => share.name.trim()).length;
    const share = Number(value.sharePrice) || 0;
    if (share > 0) {
      this.form.controls.amount.setValue(share * named, { emitEvent: false });
    }
    const total = Number(this.form.controls.amount.value) || 0;
    this.shareSummary.set(
      named > 0
        ? `${money(share)} each · ${named} ${named === 1 ? 'name' : 'names'} · Total ${money(total)}`
        : `${money(share)} each. Add the names sharing this vazhipadu.`,
    );
    this.syncBalance();
  }

  private withPayment(item: Booking, amount: number, advance: number, status: PaymentStatus): Booking {
    return {
      ...item,
      amountValue: amount,
      advanceValue: status === 'Advance' ? advance : 0,
      paymentStatus: status,
      amount: money(amount),
      advance: status === 'Advance' ? money(advance) : '',
      balance: status === 'Advance' ? money(amount - advance) : '',
    };
  }

  private syncBalance(): void {
    const amount = Number(this.form.controls.amount.value) || 0;
    const advance = Number(this.form.controls.advance.value) || 0;
    this.balance.set(Math.max(0, amount - advance));
  }

  private nextId(): string {
    const numbers = this.bookings().map((item) => Number(item.id.split('/').pop()) || 0);
    return `APB/2026/${Math.max(...numbers) + 1}`;
  }

  private chooseDay(iso: string): void {
    this.selectedDay.set(iso);
    const ayilya = this.bookings().filter((item) => item.pooja === 'Ayilya pooja' && this.bookingIso(item.date) === iso);
    this.selectedPooja.set(ayilya.length ? 'Ayilya pooja' : '');
  }

  private keepDetails(): void {
    const name = this.selectedPooja();
    if (name && !this.dayRows().some((row) => row.name === name)) {
      this.selectedPooja.set('');
    }
  }

  private matchesFilters(item: Booking): boolean {
    if (this.poojaFilter() && item.pooja !== this.poojaFilter()) {
      return false;
    }
    if (this.timeFilter() && item.time !== this.timeFilter()) {
      return false;
    }
    if (this.statusFilter() && item.paymentStatus !== this.statusFilter()) {
      return false;
    }
    if (this.pendingOnly() && this.balanceValue(item) <= 0) {
      return false;
    }
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return true;
    }
    const names = [item.devotee, item.offeringName, ...item.participants.map((person) => person.name)]
      .join(' ')
      .toLowerCase();
    const digits = query.replace(/\D/g, '');
    const mobile = item.mobile.replace(/\D/g, '');
    return names.includes(query) || (digits.length > 0 && mobile.includes(digits));
  }

  private slotLabel(rows: Booking[]): string {
    const times = [...new Set(rows.map((item) => item.time))].sort((a, b) => this.minutes(a) - this.minutes(b));
    return times.join(', ');
  }

  private paidValue(item: Booking): number {
    if (item.paymentStatus === 'Paid') {
      return item.amountValue;
    }
    if (item.paymentStatus === 'Advance') {
      return item.advanceValue;
    }
    return 0;
  }

  private balanceValue(item: Booking): number {
    return Math.max(0, item.amountValue - this.paidValue(item));
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

  private bookingIso(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : isoDate(parsed);
  }

  private devoteeCount(item: Booking): number {
    if (item.kind === 'Shared' && item.participants.length) {
      return item.participants.length;
    }
    return 1;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }

  private formatTime(value: string): string {
    const [hour, minute] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(date)
      .replace(/am|pm/i, (part) => part.toUpperCase());
  }
}
