import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  viewProviders: [provideIcons({ lucideAlertTriangle, lucideX })],
})
export class ConfirmDialogComponent {
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed?');
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  isDestructive = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
