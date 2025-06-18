/**
 * Branded types for type-safe entity IDs
 *
 * Branded types prevent accidental mixing of different ID types
 * even though they're all strings at runtime.
 */

/**
 * Base brand type helper
 */
type Brand<K, T> = K & { __brand: T };

/**
 * Entity ID types
 */
export type ProjectId = Brand<string, 'ProjectId'>;
export type UserId = Brand<string, 'UserId'>;
export type StaffId = Brand<string, 'StaffId'>;
export type SupplierId = Brand<string, 'SupplierId'>;
export type ClientId = Brand<string, 'ClientId'>;
export type ContractorId = Brand<string, 'ContractorId'>;
export type TaskId = Brand<string, 'TaskId'>;
export type PhaseId = Brand<string, 'PhaseId'>;
export type StepId = Brand<string, 'StepId'>;
export type StockItemId = Brand<string, 'StockItemId'>;
export type MaterialId = Brand<string, 'MaterialId'>;
export type BOQItemId = Brand<string, 'BOQItemId'>;
export type RoleId = Brand<string, 'RoleId'>;

/**
 * Type guard to check if a value is a valid ID (non-empty string)
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Conversion functions to create branded types
 * These validate the input and return the branded type
 */
export function toProjectId(id: string): ProjectId {
  if (!isValidId(id)) throw new Error('Invalid ProjectId');
  return id as ProjectId;
}

export function toUserId(id: string): UserId {
  if (!isValidId(id)) throw new Error('Invalid UserId');
  return id as UserId;
}

export function toStaffId(id: string): StaffId {
  if (!isValidId(id)) throw new Error('Invalid StaffId');
  return id as StaffId;
}

export function toSupplierId(id: string): SupplierId {
  if (!isValidId(id)) throw new Error('Invalid SupplierId');
  return id as SupplierId;
}

export function toClientId(id: string): ClientId {
  if (!isValidId(id)) throw new Error('Invalid ClientId');
  return id as ClientId;
}

export function toContractorId(id: string): ContractorId {
  if (!isValidId(id)) throw new Error('Invalid ContractorId');
  return id as ContractorId;
}

export function toTaskId(id: string): TaskId {
  if (!isValidId(id)) throw new Error('Invalid TaskId');
  return id as TaskId;
}

export function toPhaseId(id: string): PhaseId {
  if (!isValidId(id)) throw new Error('Invalid PhaseId');
  return id as PhaseId;
}

export function toStepId(id: string): StepId {
  if (!isValidId(id)) throw new Error('Invalid StepId');
  return id as StepId;
}

export function toStockItemId(id: string): StockItemId {
  if (!isValidId(id)) throw new Error('Invalid StockItemId');
  return id as StockItemId;
}

export function toMaterialId(id: string): MaterialId {
  if (!isValidId(id)) throw new Error('Invalid MaterialId');
  return id as MaterialId;
}

export function toBOQItemId(id: string): BOQItemId {
  if (!isValidId(id)) throw new Error('Invalid BOQItemId');
  return id as BOQItemId;
}

export function toRoleId(id: string): RoleId {
  if (!isValidId(id)) throw new Error('Invalid RoleId');
  return id as RoleId;
}

/**
 * Safe conversion functions that return null instead of throwing
 */
export function toProjectIdSafe(id: string | null | undefined): ProjectId | null {
  return isValidId(id) ? (id as ProjectId) : null;
}

export function toUserIdSafe(id: string | null | undefined): UserId | null {
  return isValidId(id) ? (id as UserId) : null;
}

export function toStaffIdSafe(id: string | null | undefined): StaffId | null {
  return isValidId(id) ? (id as StaffId) : null;
}

export function toSupplierIdSafe(id: string | null | undefined): SupplierId | null {
  return isValidId(id) ? (id as SupplierId) : null;
}

/**
 * Type for any entity ID
 */
export type EntityId =
  | ProjectId
  | UserId
  | StaffId
  | SupplierId
  | ClientId
  | ContractorId
  | TaskId
  | PhaseId
  | StepId
  | StockItemId
  | MaterialId
  | BOQItemId
  | RoleId;

/**
 * Extract the raw string value from a branded type
 */
export function toRawId<T extends EntityId>(id: T): string {
  return id;
}
