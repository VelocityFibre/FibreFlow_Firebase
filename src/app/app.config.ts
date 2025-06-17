import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withPreloading, withViewTransitions, Router } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import {
  provideFirestore,
  getFirestore,
  enableIndexedDbPersistence,
} from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { SentryErrorHandlerService } from './core/services/sentry-error-handler.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { CustomPreloadingStrategy } from './core/services/custom-preload.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(CustomPreloadingStrategy), withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([errorInterceptor, loadingInterceptor])),
    // Custom error handler that integrates Sentry
    { provide: ErrorHandler, useClass: SentryErrorHandlerService },
    // Sentry trace service for performance monitoring
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      // Enable offline persistence with error handling
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support offline persistence');
        }
      });
      return firestore;
    }),
    provideAuth(() => getAuth()),
  ],
};
