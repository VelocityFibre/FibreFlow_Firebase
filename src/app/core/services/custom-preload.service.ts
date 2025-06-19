import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, fn: () => Observable<unknown>): Observable<unknown> {
    // Only preload critical routes marked with preload: true
    if (route.data?.['preload']) {
      console.log('Preloading route:', route.path);
      return fn();
    }
    return of(null);
  }
}
