import { Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { counterLabel } from '../auth/work-options';
import { BookingStore } from '../pooja/pooja-booking';
import { HistoryEntry, pastVazhipadu, VazhipaduHistory } from '../vazhipadu-history';
import { BillStore } from './bill-store';
import { DevoteeDirectory, DevoteeRecord, FamilyMember } from './devotee-directory';

const POOJAS = [
  { id: 'archana', label: 'Archana', price: 150 },
  { id: 'abhishekam', label: 'Abhishekam', price: 500 },
  { id: 'deepa', label: 'Deepa Aradhana', price: 250 },
  { id: 'vazhipadu', label: 'Vazhipadu', price: 1000 },
  { id: 'neyvilakku', label: 'Neyvilakku', price: 100 },
  { id: 'pushpanjali', label: 'Pushpanjali', price: 50 },
  { id: 'palpayasam', label: 'Palpayasam', price: 200 },
  { id: 'other', label: 'Other', price: 0 },
] as const;

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

const PAYMENTS = ['Cash', 'UPI', 'Card'] as const;
const RELATIONS = ['Husband', 'Wife', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister'];

type MemberGroup = FormGroup<{
  name: FormControl<string>;
  relation: FormControl<string>;
  star: FormControl<string>;
}>;

interface MemberOffering {
  poojaId: string;
  label: string;
  price: number;
}

interface BillMember {
  id: string;
  name: string;
  star: string;
  relation: string;
  offerings: MemberOffering[];
}

interface MemberDraft {
  id: string;
  name: string;
  star: string;
  relation: string;
}

interface VazhipaduLine {
  name: string;
  star: string;
  price: number;
  quantity: number;
}

interface VazhipaduBill {
  label: string;
  lines: VazhipaduLine[];
  total: number;
}

interface SavedReceipt {
  bill: string;
  devotee: string;
  phone: string;
  date: string;
  item: string;
  lines: string[];
  amount: string;
  mode: string;
  slips: VazhipaduBill[];
}

@Component({
  selector: 'app-billing',
  imports: [ReactiveFormsModule],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class Billing {
  private readonly store = inject(BillStore);
  private readonly bookings = inject(BookingStore).bookings;
  private readonly history = inject(VazhipaduHistory);
  private readonly auth = inject(AuthService);
  private readonly directory = inject(DevoteeDirectory);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly poojas = POOJAS;
  protected readonly stars = STARS;
  protected readonly payments = PAYMENTS;
  protected readonly relations = RELATIONS;
  protected readonly counterText = () => counterLabel(this.auth.counter());
  protected readonly submitted = signal(false);
  protected readonly registerSubmitted = signal(false);
  protected readonly registering = signal(false);
  protected readonly lookupReady = signal(false);
  protected readonly historyPhone = signal('');
  protected readonly vazhipaduHistory = computed(() =>
    pastVazhipadu(this.historyPhone(), this.bookings(), this.history.rows()),
  );
  protected readonly walkIn = signal(false);
  protected readonly household = signal<DevoteeRecord | null>(null);
  protected readonly amount = signal(0);
  protected readonly members = signal<BillMember[]>([]);
  protected readonly memberDraft = signal<MemberDraft | null>(null);
  protected readonly memberDraftError = signal('');
  protected readonly applyNote = signal('');
  protected readonly memberExtras = signal<Record<string, string>>({});
  protected readonly memberTotal = computed(() =>
    this.members().reduce(
      (sum, member) => sum + member.offerings.reduce((inner, offering) => inner + offering.price, 0),
      0,
    ),
  );
  protected readonly offeringCount = computed(() =>
    this.members().reduce((sum, member) => sum + member.offerings.length, 0),
  );
  private quantityFromOfferings = false;
  private walkSeq = 0;
  protected readonly printError = signal('');
  protected readonly receipt = signal<SavedReceipt | null>(null);

  readonly closed = output<void>();

  protected readonly form = this.fb.group({
    devotee: ['', Validators.required],
    phone: ['', Validators.pattern(/^$|^\d{10}$/)],
    star: [''],
    pooja: ['', Validators.required],
    offeringName: [''],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(1)]],
    payment: ['', Validators.required],
    remarks: [''],
  });

  protected readonly registerForm = this.fb.group({
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    name: ['', Validators.required],
    star: [''],
    family: this.fb.array<MemberGroup>([]),
  });

  protected get family() {
    return this.registerForm.controls.family;
  }

  constructor() {
    this.form.valueChanges.subscribe(() => this.syncAmount());
    this.form.controls.phone.valueChanges.subscribe((phone) => this.lookup(phone));
    this.form.controls.pooja.valueChanges.subscribe((id) => {
      const item = POOJAS.find((pooja) => pooja.id === id);
      if (item) {
        this.form.controls.price.setValue(item.price);
      }
    });
  }

  protected errorFor(
    name: 'devotee' | 'phone' | 'pooja' | 'date' | 'quantity' | 'price' | 'payment',
  ): string {
    const control = this.form.controls[name];
    if (!this.submitted() || !control.errors) {
      return '';
    }
    if (name === 'devotee') return 'Enter the devotee name.';
    if (name === 'phone') return 'Enter a 10-digit mobile number.';
    if (name === 'pooja') return 'Select a pooja.';
    if (name === 'date') return 'Choose the pooja date.';
    if (name === 'quantity') return 'Enter a quantity of at least 1.';
    if (name === 'price') return 'Enter the price.';
    return 'Select a payment mode.';
  }

  protected setWalkIn(checked: boolean): void {
    this.walkIn.set(checked);
    this.memberDraft.set(null);
    this.memberDraftError.set('');
    this.household.set(null);
    this.lookupReady.set(false);
    this.historyPhone.set('');
    this.memberExtras.set({});
    if (checked) {
      this.form.controls.phone.setValue('', { emitEvent: false });
      this.form.controls.phone.disable({ emitEvent: false });
      this.form.controls.devotee.setValue('');
      this.form.controls.devotee.disable({ emitEvent: false });
      this.form.controls.star.setValue('');
      this.form.controls.offeringName.setValue('');
      this.members.set([this.blankWalkIn(), this.blankWalkIn()]);
      this.applyNote.set('Add each person. Apply to all adds the pooja for every name.');
    } else {
      this.form.controls.phone.enable({ emitEvent: false });
      this.form.controls.devotee.enable({ emitEvent: false });
      this.members.set([]);
      this.applyNote.set('');
    }
    this.syncAmount();
  }

  protected addWalkInPerson(): void {
    this.members.update((list) => [...list, this.blankWalkIn()]);
  }

  protected removeWalkIn(id: string): void {
    this.members.update((list) => list.filter((member) => member.id !== id));
    this.memberExtras.update((choices) => {
      const next = { ...choices };
      delete next[id];
      return next;
    });
    this.syncAmount();
  }

  protected patchWalkIn(id: string, field: 'name' | 'star', value: string): void {
    this.members.update((list) =>
      list.map((member) => (member.id === id ? { ...member, [field]: value } : member)),
    );
  }

  protected namedMembers(): BillMember[] {
    return this.members().filter((member) => member.name.trim());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.walkIn() && !this.namedMembers().length) {
      this.applyNote.set('Add each person\'s name before printing.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const pooja = POOJAS.find((item) => item.id === value.pooja);
    const item = pooja?.label ?? 'Pooja';
    const lines = this.members()
      .filter((member) => member.offerings.length)
      .map(
        (member) =>
          `${member.name} — ${member.offerings.map((offering) => `${offering.label} ₹ ${offering.price.toLocaleString('en-IN')}`).join(', ')}`,
      );
    const total = this.amount();
    const amount = `₹ ${total.toLocaleString('en-IN')}`;
    const bill = `TMB/2026/${1046 + this.store.bills().length}`;
    const summary = lines.length
      ? lines.join('; ')
      : value.offeringName.trim()
        ? `${item} · ${value.offeringName.trim()}`
        : item;
    const slips = this.vazhipaduBills();
    const devotee = this.walkIn() ? this.namedMembers()[0]?.name ?? 'Walk-in' : value.devotee.trim();
    this.store.add({
      time: new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()),
      bill,
      item: summary,
      amount,
      mode: value.payment,
    });
    this.rememberHistory(value.phone, devotee, this.formatDate(value.date), slips);

    this.printError.set('');
    this.sendPrint({
      bill,
      devotee,
      phone: value.phone,
      date: this.formatDate(value.date),
      item: summary,
      lines,
      amount,
      mode: value.payment,
      slips,
    });
  }

  protected applyToAll(): void {
    const selected = POOJAS.find((pooja) => pooja.id === this.form.controls.pooja.value);
    const people = this.members().filter((member) => member.name.trim());
    if (!selected) {
      this.applyNote.set('Select a pooja, then apply it to all.');
      return;
    }
    if (!people.length) {
      this.applyNote.set(
        this.walkIn()
          ? 'Add each person\'s name, then apply the pooja to all.'
          : 'Enter a saved mobile number so each family member is listed.',
      );
      return;
    }
    const price = Number(this.form.controls.price.value) || selected.price;
    if (price < 1) {
      this.applyNote.set('Enter the price before applying it to all.');
      return;
    }
    const added: string[] = [];
    const skipped: string[] = [];
    this.members.update((list) =>
      list.map((member) => {
        if (!member.name.trim()) {
          return member;
        }
        if (member.offerings.some((offering) => offering.poojaId === selected.id)) {
          skipped.push(member.name);
          return member;
        }
        added.push(member.name);
        return {
          ...member,
          offerings: [...member.offerings, { poojaId: selected.id, label: selected.label, price }],
        };
      }),
    );
    this.syncAmount();
    this.applyNote.set(this.applyMessage(selected.label, added, skipped));
  }

  protected subtotal(member: BillMember): number {
    return member.offerings.reduce((sum, offering) => sum + offering.price, 0);
  }

  protected poojaLabel(): string {
    return POOJAS.find((pooja) => pooja.id === this.form.controls.pooja.value)?.label ?? '';
  }

  protected printCart(): void {
    const saved = this.receipt();
    if (!saved?.slips.length) {
      this.printError.set('Add a pooja before printing the bill.');
      return;
    }
    this.sendPrint(saved);
  }

  private sendPrint(saved: SavedReceipt): void {
    if (!saved.slips.length) {
      this.applyNote.set('Add a pooja before printing the bill.');
      return;
    }
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Bill');
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
    win.document.write(this.slipDocument(saved));
    win.document.close();
    setTimeout(run, 300);
  }

  protected extraChoice(id: string): string {
    return this.memberExtras()[id] ?? '';
  }

  protected setExtra(id: string, poojaId: string): void {
    this.memberExtras.update((choices) => ({ ...choices, [id]: poojaId }));
  }

  protected addOffering(id: string): void {
    const poojaId = this.extraChoice(id);
    const selected = POOJAS.find((pooja) => pooja.id === poojaId);
    const member = this.members().find((item) => item.id === id);
    if (!selected || selected.price < 1) {
      this.applyNote.set('Select the extra offering for that member.');
      return;
    }
    if (!member) {
      return;
    }
    if (member.offerings.some((offering) => offering.poojaId === selected.id)) {
      this.applyNote.set(`${selected.label} is already on ${member.name}'s list.`);
      return;
    }
    this.members.update((list) =>
      list.map((item) =>
        item.id === id
          ? {
              ...item,
              offerings: [...item.offerings, { poojaId: selected.id, label: selected.label, price: selected.price }],
            }
          : item,
      ),
    );
    this.syncAmount();
    this.applyNote.set(`${selected.label} added for ${member.name} only.`);
  }

  protected removeOffering(id: string, poojaId: string): void {
    const member = this.members().find((item) => item.id === id);
    const label = member?.offerings.find((offering) => offering.poojaId === poojaId)?.label ?? 'Offering';
    this.members.update((list) =>
      list.map((item) =>
        item.id === id
          ? { ...item, offerings: item.offerings.filter((offering) => offering.poojaId !== poojaId) }
          : item,
      ),
    );
    this.syncAmount();
    this.applyNote.set(member ? `${label} removed from ${member.name}'s list.` : '');
  }

  protected asText(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  protected asChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected editingMember(id: string): MemberDraft | null {
    const draft = this.memberDraft();
    return draft?.id === id ? draft : null;
  }

  protected beginMemberEdit(member: BillMember): void {
    this.memberDraft.set({
      id: member.id,
      name: member.name,
      star: member.star,
      relation: member.relation,
    });
    this.memberDraftError.set('');
  }

  protected patchMemberDraft(field: 'name' | 'star' | 'relation', value: string): void {
    this.memberDraft.update((draft) => (draft ? { ...draft, [field]: value } : draft));
  }

  protected cancelMemberEdit(): void {
    this.memberDraft.set(null);
    this.memberDraftError.set('');
  }

  protected saveMemberEdit(): void {
    const draft = this.memberDraft();
    if (!draft) {
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      this.memberDraftError.set('Enter the member name.');
      return;
    }
    const current = this.members().find((member) => member.id === draft.id);
    if (!current) {
      this.cancelMemberEdit();
      return;
    }
    this.members.update((list) =>
      list.map((member) =>
        member.id === draft.id
          ? {
              ...member,
              name,
              star: draft.star,
              relation: member.id === 'head' ? member.relation : draft.relation,
            }
          : member,
      ),
    );
    this.rememberMember(draft.id, name, draft.star, draft.relation, current);
    this.memberDraft.set(null);
    this.memberDraftError.set('');
    this.applyNote.set(`${name}'s details saved. Their offerings stay as they are.`);
  }

  protected choosePerson(devoteeName: string, star: string, offeringName: string): void {
    this.form.controls.devotee.setValue(devoteeName);
    this.form.controls.star.setValue(star);
    this.form.controls.offeringName.setValue(offeringName);
  }

  protected openRegister(): void {
    const mobile = this.form.controls.phone.value.replace(/\D/g, '');
    const existing = this.directory.find(mobile);
    this.registerSubmitted.set(false);
    this.family.clear();
    this.registerForm.controls.mobile.setValue(existing?.mobile ?? mobile);
    this.registerForm.controls.name.setValue(existing?.name ?? '');
    this.registerForm.controls.star.setValue(existing?.star ?? '');
    existing?.family.forEach((member) => this.family.push(this.memberGroup(member)));
    this.registering.set(true);
  }

  protected closeRegister(): void {
    this.registering.set(false);
  }

  protected addMember(): void {
    this.family.push(this.memberGroup());
  }

  protected removeMember(index: number): void {
    this.family.removeAt(index);
  }

  protected saveRegister(): void {
    this.registerSubmitted.set(true);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const value = this.registerForm.getRawValue();
    const record: DevoteeRecord = {
      mobile: value.mobile,
      name: value.name.trim(),
      star: value.star,
      family: value.family
        .filter((member) => member.name.trim())
        .map((member) => ({
          name: member.name.trim(),
          relation: member.relation,
          star: member.star,
        })),
    };
    this.directory.save(record);
    this.form.controls.phone.setValue(record.mobile);
    this.form.controls.devotee.setValue(record.name);
    this.form.controls.star.setValue(record.star);
    this.household.set(record);
    this.members.set(this.membersFrom(record));
    this.applyNote.set(`${record.name}'s family is ready. Choose a pooja and use Apply to all.`);
    this.lookupReady.set(true);
    this.registering.set(false);
  }

  protected registerError(name: 'mobile' | 'name'): string {
    const control = this.registerForm.controls[name];
    if (!this.registerSubmitted() || !control.errors) {
      return '';
    }
    return name === 'mobile' ? 'Enter a 10-digit mobile number.' : 'Enter the devotee name.';
  }

  protected another(): void {
    this.receipt.set(null);
    this.printError.set('');
    this.submitted.set(false);
    this.household.set(null);
    this.members.set([]);
    this.memberDraft.set(null);
    this.memberDraftError.set('');
    this.applyNote.set('');
    this.memberExtras.set({});
    this.lookupReady.set(false);
    this.walkIn.set(false);
    this.form.controls.phone.enable({ emitEvent: false });
    this.form.controls.devotee.enable({ emitEvent: false });
    this.form.reset({
      devotee: '',
      phone: '',
      star: '',
      pooja: '',
      offeringName: '',
      date: new Date().toISOString().slice(0, 10),
      quantity: 1,
      price: 0,
      payment: '',
      remarks: '',
    });
    this.amount.set(0);
  }

  private vazhipaduBills(): VazhipaduBill[] {
    const grouped = new Map<string, VazhipaduBill>();
    for (const member of this.members()) {
      if (!member.name.trim()) {
        continue;
      }
      for (const offering of member.offerings) {
        const bill = grouped.get(offering.poojaId) ?? { label: offering.label, lines: [], total: 0 };
        bill.lines.push({ name: member.name.trim(), star: member.star, price: offering.price, quantity: 1 });
        bill.total += offering.price;
        grouped.set(offering.poojaId, bill);
      }
    }
    const slips = POOJAS.map((pooja) => grouped.get(pooja.id)).filter((bill): bill is VazhipaduBill => !!bill);
    if (slips.length) {
      return slips;
    }
    const value = this.form.getRawValue();
    const price = Number(value.price) || 0;
    const quantity = Math.max(1, Number(value.quantity) || 1);
    return [
      {
        label: this.poojaLabel() || 'Pooja',
        lines: [{ name: value.devotee.trim() || 'Devotee', star: value.star, price, quantity }],
        total: Math.max(0, Math.round(price * quantity)),
      },
    ];
  }

  private slipDocument(saved: SavedReceipt): string {
    const pages = saved.slips
      .map((slip) => {
        const rows = slip.lines
          .map((line) => {
            const who = line.star ? `${line.name} · ${line.star}` : line.name;
            const amount = line.quantity > 1 ? `${line.quantity} × ${this.rupees(line.price)}` : this.rupees(line.price);
            return `<tr><td>${this.escape(who)}</td><td>${this.escape(amount)}</td></tr>`;
          })
          .join('');
        return `<section class="slip">
          <h1>ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം</h1>
          <p>അവനവൻചേരി</p>
          <p>${this.escape(saved.bill)} · ${this.escape(saved.date)} · ${this.escape(saved.mode)}</p>
          <p>Mobile ${this.escape(saved.phone || '—')}</p>
          <h2>${this.escape(slip.label)}</h2>
          <table>${rows}</table>
          <p class="grand">Total ${this.escape(this.rupees(slip.total))}</p>
        </section>`;
      })
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(saved.bill)}</title>
      <style>
        body { margin: 16px; color: #000; font-family: "Noto Serif Malayalam", "Segoe UI", sans-serif; }
        h1 { margin: 0; font-size: 20px; }
        h2 { margin: 14px 0 6px; font-size: 18px; }
        p, table { margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; }
        td:last-child, .grand { text-align: right; }
        .grand { font-size: 18px; font-weight: 700; margin-top: 12px; }
        .slip { break-after: page; page-break-after: always; }
        .slip:last-child { break-after: auto; page-break-after: auto; }
      </style></head><body>${pages}</body></html>`;
  }

  private formatDate(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
  }

  private rupees(value: number): string {
    return `₹ ${value.toLocaleString('en-IN')}`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private rememberHistory(phone: string, devotee: string, date: string, slips: VazhipaduBill[]): void {
    const mobile = phone.replace(/\D/g, '');
    if (mobile.length !== 10) {
      return;
    }
    const stamped = Date.now();
    const entries: HistoryEntry[] = slips.map((slip, index) => ({
      id: `counter-${stamped}-${index}`,
      mobile,
      devotee,
      pooja: slip.label,
      star: '',
      date,
      detail: `₹ ${slip.total.toLocaleString('en-IN')} · Counter`,
    }));
    this.history.remember(entries);
  }

  private blankWalkIn(): BillMember {
    this.walkSeq += 1;
    return { id: `walk-${this.walkSeq}`, name: '', star: '', relation: '', offerings: [] };
  }

  private lookup(phone: string): void {
    if (this.walkIn()) {
      return;
    }
    const ready = phone.replace(/\D/g, '').length === 10;
    const record = this.directory.find(phone);
    const sameHousehold = this.household()?.mobile === record?.mobile;
    this.lookupReady.set(ready);
    this.historyPhone.set(ready ? phone.replace(/\D/g, '') : '');
    this.household.set(record);
    if (!ready) {
      return;
    }
    this.memberDraft.set(null);
    this.memberDraftError.set('');
    this.members.set(record ? this.membersFrom(record, sameHousehold ? this.members() : []) : []);
    this.memberExtras.set({});
    if (record && !this.form.controls.devotee.value.trim()) {
      this.form.controls.devotee.setValue(record.name);
      if (!this.form.controls.star.value) {
        this.form.controls.star.setValue(record.star);
      }
    }
    this.applyNote.set(record ? `${record.name}'s family is ready. Choose a pooja and use Apply to all.` : '');
    this.syncAmount();
  }

  private membersFrom(record: DevoteeRecord, previous: BillMember[] = []): BillMember[] {
    const next: BillMember[] = [
      { id: 'head', name: record.name, star: record.star, relation: '', offerings: [] },
      ...record.family.map((member, index) => ({
        id: `family-${index}`,
        name: member.name,
        star: member.star,
        relation: member.relation,
        offerings: [],
      })),
    ];
    return next.map((member) => {
      const existing = previous.find((item) => item.id === member.id);
      return existing ? { ...member, offerings: existing.offerings } : member;
    });
  }

  private rememberMember(id: string, name: string, star: string, relation: string, previous: BillMember): void {
    const record = this.household();
    if (!record) {
      return;
    }
    const next: DevoteeRecord =
      id === 'head'
        ? { ...record, name, star }
        : {
            ...record,
            family: record.family.map((member, index) =>
              id === `family-${index}` ? { name, relation, star } : member,
            ),
          };
    this.household.set(next);
    this.directory.save(next);
    if (id === 'head' && this.form.controls.devotee.value.trim() === previous.name) {
      this.form.controls.devotee.setValue(name);
    }
    if (id === 'head' && this.form.controls.star.value === previous.star) {
      this.form.controls.star.setValue(star);
    }
    if (this.form.controls.offeringName.value.trim() === previous.name) {
      this.form.controls.offeringName.setValue(name);
    }
  }

  private applyMessage(label: string, added: string[], skipped: string[]): string {
    if (!added.length && skipped.length) {
      return `${label} is already on every member's list.`;
    }
    const addedText = added.length ? `${label} added for ${this.joinNames(added)}.` : '';
    const skippedText = skipped.length ? ` ${this.joinNames(skipped)} already had it.` : '';
    return `${addedText}${skippedText}`;
  }

  private joinNames(names: string[]): string {
    if (names.length <= 1) {
      return names[0] ?? '';
    }
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  private memberGroup(member?: FamilyMember): MemberGroup {
    return this.fb.group({
      name: [member?.name ?? '', Validators.required],
      relation: [member?.relation ?? ''],
      star: [member?.star ?? ''],
    });
  }

  private syncAmount(): void {
    const count = this.offeringCount();
    if (count > 0) {
      this.quantityFromOfferings = true;
      if (this.form.controls.quantity.value !== count) {
        this.form.controls.quantity.setValue(count, { emitEvent: false });
      }
    } else if (this.quantityFromOfferings) {
      this.quantityFromOfferings = false;
      if (this.form.controls.quantity.value !== 1) {
        this.form.controls.quantity.setValue(1, { emitEvent: false });
      }
    }
    const memberTotal = this.memberTotal();
    if (memberTotal > 0) {
      this.amount.set(memberTotal);
      return;
    }
    const price = Number(this.form.controls.price.value) || 0;
    const quantity = Number(this.form.controls.quantity.value) || 0;
    this.amount.set(Math.max(0, Math.round(price * quantity)));
  }
}
