/**
 * Environment configuration types
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface SentryConfig {
  dsn: string;
  environment: 'development' | 'staging' | 'production';
}

export interface FirefliesConfig {
  apiKey: string;
}

export interface Environment {
  production: boolean;
  firebase: FirebaseConfig;
  sentry: SentryConfig;
  fireflies?: FirefliesConfig;
}
