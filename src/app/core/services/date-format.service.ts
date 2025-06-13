import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DateFormatService {
  private readonly timezone = 'Africa/Johannesburg';
  private readonly locale = 'en-ZA';

  formatDate(date: Date | { toDate(): Date } | string | null | undefined): string {
    if (!date) return 'N/A';
    const d = (date as { toDate(): Date }).toDate
      ? (date as { toDate(): Date }).toDate()
      : new Date(date as string | Date);

    return d.toLocaleDateString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatShortDate(date: Date | { toDate(): Date } | string | null | undefined): string {
    if (!date) return 'N/A';
    const d = (date as { toDate(): Date }).toDate
      ? (date as { toDate(): Date }).toDate()
      : new Date(date as string | Date);

    return d.toLocaleDateString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date | { toDate(): Date } | string | null | undefined): string {
    if (!date) return 'N/A';
    const d = (date as { toDate(): Date }).toDate
      ? (date as { toDate(): Date }).toDate()
      : new Date(date as string | Date);

    return d.toLocaleString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
