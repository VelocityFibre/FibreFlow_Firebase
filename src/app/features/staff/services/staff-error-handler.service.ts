import { Injectable, ErrorHandler, inject } from '@angular/core';
import { EventBusService } from '../../../core/services/event-bus.service';

@Injectable()
export class StaffErrorHandler implements ErrorHandler {
  private eventBus = inject(EventBusService);

  handleError(error: Error): void {
    console.error('Staff Module Error:', error);

    // Emit error event so other modules know but aren't affected
    this.eventBus.emit({
      type: 'staff.error',
      payload: {
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      },
      source: 'StaffModule',
      timestamp: new Date(),
    });

    // Module continues to function with degraded features
    // Does not crash the entire application
  }
}
