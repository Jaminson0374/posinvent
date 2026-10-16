import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SCALE_STATUS } from '../../../core/models/scale.model';
import { ScaleConfigService } from '../../../core/services/scale-config.service';
import { ScaleService } from '../../../core/services/scale.service';

/**
 * Brand-agnostic scale connection settings: baud rate, frame parse expression
 * and stability token, persisted in localStorage. "Probar conexión" opens the
 * port with the current values so the user can validate their hardware.
 */
@Component({
  selector: 'app-scale-config-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './scale-config-dialog.html',
  styleUrl: './scale-config-dialog.css',
})
export class ScaleConfigDialogComponent {
  private readonly config = inject(ScaleConfigService);
  private readonly scale = inject(ScaleService);
  private readonly dialogRef = inject(MatDialogRef<ScaleConfigDialogComponent>);

  readonly baudRateControl = new FormControl<number>(this.config.baudRate(), {
    nonNullable: true,
    validators: [Validators.required, Validators.min(300)],
  });
  readonly patternControl = new FormControl<string>(this.config.parsePattern(), {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly stableTokenControl = new FormControl<string>(this.config.stableToken(), {
    nonNullable: true,
  });

  readonly testing = signal(false);
  readonly testMessage = signal<string | null>(null);
  readonly testOk = signal(false);

  async testConnection(): Promise<void> {
    this.applyConfig();
    this.testing.set(true);
    this.testMessage.set(null);
    try {
      await this.scale.connect();
    } finally {
      this.testing.set(false);
    }

    const connected = this.scale.status() === SCALE_STATUS.CONNECTED;
    this.testOk.set(connected);
    this.testMessage.set(
      connected
        ? 'Conexión establecida con la báscula.'
        : (this.scale.errorMessage() ?? 'No se pudo conectar con la báscula.'),
    );
  }

  save(): void {
    this.applyConfig();
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private applyConfig(): void {
    const baud = Number(this.baudRateControl.value);
    if (Number.isFinite(baud) && baud > 0) this.config.setBaudRate(baud);
    this.config.setParsePattern(this.patternControl.value);
    this.config.setStableToken(this.stableTokenControl.value);
  }
}
