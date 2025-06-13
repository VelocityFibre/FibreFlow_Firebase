import { Component, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Base component that provides automatic subscription cleanup
 *
 * Usage:
 * ```typescript
 * export class MyComponent extends DestroyableComponent {
 *   ngOnInit() {
 *     this.myService.getData()
 *       .pipe(this.takeUntilDestroyed())
 *       .subscribe(data => console.log(data));
 *   }
 * }
 * ```
 */
@Component({
  template: '',
})
export abstract class DestroyableComponent implements OnDestroy {
  protected destroy$ = new Subject<void>();
  protected destroyRef = inject(DestroyRef);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns takeUntilDestroyed operator for automatic cleanup
   */
  protected takeUntilDestroyed() {
    return takeUntilDestroyed(this.destroyRef);
  }
}

/**
 * Mixin for adding destroy functionality to existing components
 *
 * Usage:
 * ```typescript
 * export class MyComponent extends withDestroy(BaseComponent) {
 *   // Component implementation
 * }
 * ```
 */
export function withDestroy<T extends new (...args: unknown[]) => object>(Base: T) {
  return class extends Base implements OnDestroy {
    protected destroy$ = new Subject<void>();
    protected destroyRef = inject(DestroyRef);

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
      if (super.ngOnDestroy) {
        super.ngOnDestroy();
      }
    }

    protected takeUntilDestroyed() {
      return takeUntilDestroyed(this.destroyRef);
    }
  };
}
