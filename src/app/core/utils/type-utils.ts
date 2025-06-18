/**
 * Advanced TypeScript utility functions using const type parameters
 */

/**
 * Gets a typed value from an object with const type parameter
 * Preserves literal types in the key
 */
export function getTypedValue<const K extends PropertyKey, T extends Record<K, unknown>>(
  obj: T,
  key: K,
): T[K] {
  return obj[key];
}

/**
 * Creates a readonly tuple from arguments with preserved literal types
 */
export function tuple<const T extends readonly unknown[]>(...items: T): T {
  return items;
}

/**
 * Converts a value to an array, preserving const types
 */
export function toArray<const T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Creates an object with const keys
 */
export function createObject<const K extends PropertyKey, V>(
  keys: readonly K[],
  getValue: (key: K) => V,
): Record<K, V> {
  const result = {} as Record<K, V>;
  for (const key of keys) {
    result[key] = getValue(key);
  }
  return result;
}

/**
 * Picks specific keys from an object with const preservation
 */
export function pick<T, const K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specific keys from an object with const preservation
 */
export function omit<T, const K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Type-safe array includes with const type parameter
 */
export function includes<const T>(array: readonly T[], value: unknown): value is T {
  return array.includes(value as T);
}

/**
 * Creates a mapping function with const type preservation
 */
export function mapValues<const K extends PropertyKey, V, R>(
  obj: Record<K, V>,
  fn: (value: V, key: K) => R,
): Record<K, R> {
  const result = {} as Record<K, R>;
  for (const key in obj) {
    result[key] = fn(obj[key], key);
  }
  return result;
}

/**
 * Groups array items by a key with const type preservation
 */
export function groupBy<const T, const K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = getKey(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

/**
 * Creates a type-safe enum-like object
 */
export function createEnum<const T extends readonly string[]>(
  ...values: T
): { readonly [K in T[number]]: K } {
  const result = {} as { [K in T[number]]: K };
  for (const value of values) {
    (result as any)[value] = value;
  }
  return result;
}
