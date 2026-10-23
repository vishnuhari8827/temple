import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { COUNTERS, CounterId, counterLabel as labelForCounter } from '../auth/work-options';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private clock: ReturnType<typeof setInterval> | undefined;
  protected readonly now = signal(new Date());

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly counters = COUNTERS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    counter: ['' as '' | CounterId, Validators.required],
    staffId: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  constructor() {
    inject(Title).setTitle('Sign in · ശ്രീ ഇണ്ടിളയപ്പൻ ക്ഷേത്രം, അവനവൻചേരി');
    this.clock = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      clearInterval(this.clock);
    });
  }

  protected clockTime(): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(this.now());
  }

  protected clockDate(): string {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.now());
  }

  @HostListener('document:click')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenuOnEscape(): void {
    this.menuOpen.set(false);
  }

  protected counterLabel(): string {
    return labelForCounter(this.form.controls.counter.value);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected chooseCounter(counter: CounterId): void {
    this.form.controls.counter.setValue(counter);
    this.form.controls.counter.markAsTouched();
    this.menuOpen.set(false);
  }

  protected errorFor(name: 'counter' | 'staffId' | 'password'): string {
    const control = this.form.controls[name];
    if (control.valid || (!control.touched && !this.submitted())) {
      return '';
    }
    if (control.hasError('required')) {
      if (name === 'counter') {
        return 'Select a counter.';
      }
      return name === 'staffId' ? 'Enter your staff ID.' : 'Enter your password.';
    }
    if (control.hasError('minlength')) {
      return 'Use at least 6 characters.';
    }
    return '';
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.errorMessage.set('');
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { staffId, password, remember, counter } = this.form.getRawValue();
    this.submitting.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.submitting.set(false);
      if (!counter || !this.auth.login(staffId, password, remember, counter)) {
        this.errorMessage.set('Those details don’t match our records.');
        return;
      }
      void this.router.navigateByUrl('/home');
    }, 450);
  }
}
