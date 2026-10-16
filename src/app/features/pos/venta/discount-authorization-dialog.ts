import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

/** Administrator credentials handed back to the cashier to authorize a discount. */
export interface DiscountAuthorizationCredentials {
  username: string;
  password: string;
}

/**
 * Asks a cashier to enter an administrator's credentials when the backend rejects a
 * checkout with DISCOUNT_AUTHORIZATION_REQUIRED. The password only lives in this form
 * and is never persisted; the component is discarded right after it closes.
 */
@Component({
  selector: 'app-discount-authorization-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './discount-authorization-dialog.html',
  styleUrl: './discount-authorization-dialog.css',
})
export class DiscountAuthorizationDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<DiscountAuthorizationDialogComponent, DiscountAuthorizationCredentials | null>,
  );
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    // Clear the in-memory password before closing so it is not kept around.
    this.form.reset();
    this.dialogRef.close({ username, password });
  }

  cancel(): void {
    this.form.reset();
    this.dialogRef.close(null);
  }
}
