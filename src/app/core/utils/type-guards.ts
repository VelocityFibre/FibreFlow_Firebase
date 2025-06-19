import { Timestamp } from '@angular/fire/firestore';

/**
 * Type guards for common data validation
 */

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );
}

export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/**
 * Converts various date formats to a Date object
 */
export function toDate(value: Date | Timestamp | string | null | undefined): Date | null {
  if (!value) return null;

  if (isFirestoreTimestamp(value)) {
    return value.toDate();
  }

  if (isValidDate(value)) {
    return value;
  }

  if (isString(value)) {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }

  return null;
}

/**
 * Type for any value that can be converted to a Date
 */
export type DateLike = Date | Timestamp | string | null | undefined;
