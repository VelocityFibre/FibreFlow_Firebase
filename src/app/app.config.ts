import {
  ApplicationConfig,
  provideZoneChangeDetection,
  ErrorHandler,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withPreloading, withViewTransitions, Router } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideServiceWorker } from '@angular/service-worker';
import * as Sentry from '@sentry/angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { SentryErrorHandlerService } from './core/services/sentry-error-handler.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { CustomPreloadingStrategy } from './core/services/custom-preload.service';
import { AppInitializerService } from './core/services/app-initializer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(CustomPreloadingStrategy), withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([errorInterceptor, loadingInterceptor])),
    provideNativeDateAdapter(),
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
    {
      provide: APP_INITIALIZER,
      useFactory: (initializer: AppInitializerService) => () => initializer.initialize(),
      deps: [AppInitializerService],
      multi: true,
    },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      // Persistence will be enabled after app initialization to avoid NG0200
      return firestore;
    }),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideFunctions(() => getFunctions(undefined, 'us-central1')),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
};
