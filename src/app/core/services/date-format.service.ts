import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateFormatService {
  private readonly timezone = 'Africa/Johannesburg';
  private readonly locale = 'en-ZA';

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    return d.toLocaleDateString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatShortDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    return d.toLocaleDateString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    return d.toLocaleString(this.locale, {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}