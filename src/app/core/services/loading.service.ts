import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingCount = signal(0);

  // Public signal for components to use
  readonly isLoading = computed(() => this.loadingCount() > 0);

  // Legacy observable support for gradual migration
  get loading$() {
    console.warn('LoadingService.loading$ is deprecated. Use isLoading signal instead.');
    return new BehaviorSubject(this.isLoading());
  }

  show(): void {
    this.loadingCount.update((count) => count + 1);
  }

  hide(): void {
    this.loadingCount.update((count) => Math.max(0, count - 1));
  }

  // Force reset loading state (use with caution)
  reset(): void {
    this.loadingCount.set(0);
  }
}

// Temporary import for legacy support
import { BehaviorSubject } from 'rxjs';
