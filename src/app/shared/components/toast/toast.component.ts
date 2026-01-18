import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle,
  lucideXCircle,
  lucideAlertTriangle,
  lucideInfo,
  lucideX,
} from '@ng-icons/lucide';
import { ToastService } from '@core/services';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  viewProviders: [
    provideIcons({
      lucideCheckCircle,
      lucideXCircle,
      lucideAlertTriangle,
      lucideInfo,
      lucideX,
    }),
  ],
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'lucideCheckCircle',
      error: 'lucideXCircle',
      warning: 'lucideAlertTriangle',
      info: 'lucideInfo',
    };
    return icons[type] || 'lucideInfo';
  }

  getColorClass(type: string): string {
    const colors: Record<string, string> = {
      success: 'bg-gradient-to-r from-green-600 to-green-700',
      error: 'bg-gradient-to-r from-red-600 to-red-700',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-600',
      info: 'bg-gradient-to-r from-blue-600 to-blue-700',
    };
    return colors[type] || colors['info'];
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
