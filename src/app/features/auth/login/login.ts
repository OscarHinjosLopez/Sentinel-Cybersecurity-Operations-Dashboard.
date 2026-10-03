import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS, User } from '../../../core/auth/auth.models';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../../core/auth/data-access/demo-accounts';
import { safeReturnUrl } from '../../../core/auth/return-url';
import { ThemeService } from '../../../core/services/theme.service';
import { Icon } from '../../../shared/ui/icon/icon';
@Component({
  selector: 'app-login',
  imports: [TitleCasePipe, ReactiveFormsModule, MatButtonModule, MatTooltipModule, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  private readonly errorMessage = viewChild<ElementRef<HTMLElement>>('errorMessage');
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly passwordVisible = signal(false);
  readonly error = signal('');
  protected readonly accounts = DEMO_ACCOUNTS;
  protected readonly roleLabels = ROLE_LABELS;
  fillDemo(user: User): void {
    if (this.auth.isLoading()) return;
    this.form.setValue({ email: user.email, password: DEMO_PASSWORD });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.error.set('');
    this.emailInput()?.nativeElement.focus();
  }
  async submit(): Promise<void> {
    if (this.auth.isLoading()) return;
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      (this.form.controls.email.invalid
        ? this.emailInput()
        : this.passwordInput()
      )?.nativeElement.focus();
      return;
    }
    const result = await this.auth.login(this.form.getRawValue());
    if (result.success) {
      await this.router.navigateByUrl(
        safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
        { replaceUrl: true },
      );
      return;
    }
    if (result.error === 'cancelled' || result.error === 'busy') return;
    this.error.set(
      result.error === 'invalid-credentials'
        ? 'Invalid email or password.'
        : 'Unable to sign in. Please try again.',
    );
    afterNextRender(() => this.errorMessage()?.nativeElement.focus(), { injector: this.injector });
  }
}
