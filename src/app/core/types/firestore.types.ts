import { Timestamp } from '@angular/fire/firestore';

/**
 * Type for date fields that can be either a Date, Firestore Timestamp, or string
 */
export type DateLike = Date | Timestamp | string | { toDate?: () => Date };

/**
 * Type guard to check if a value is a Firestore Timestamp
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return (
    value instanceof Timestamp ||
    (typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as any).toDate === 'function')
  );
}

/**
 * Convert various date formats to a Date object
 */
export function toDate(value: DateLike | undefined | null): Date {
  if (!value) return new Date(0);

  if (value instanceof Date) {
    return value;
  }

  if (isTimestamp(value)) {
    return value.toDate();
  }

  if (typeof value === 'string') {
    return new Date(value);
  }

  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return new Date(0);
}

/**
 * Type-safe collection reference
 */
export type TypedCollectionReference<T> = import('@angular/fire/firestore').CollectionReference<T>;

/**
 * Type-safe document reference
 */
export type TypedDocumentReference<T> = import('@angular/fire/firestore').DocumentReference<T>;
