/**
 * Discriminated unions for type-safe state management
 */

/**
 * Generic loading state for async operations
 */
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; timestamp: Date }
  | { status: 'error'; error: Error; timestamp: Date };

/**
 * Form state for create/edit/view modes
 */
export type FormState<T> =
  | { mode: 'create'; data: Partial<T>; isDirty: boolean }
  | { mode: 'edit'; data: T; id: string; isDirty: boolean; originalData: T }
  | { mode: 'view'; data: T; id: string };

/**
 * Async operation result
 */
export type AsyncOperation<T> =
  | { state: 'pending' }
  | { state: 'fulfilled'; value: T }
  | { state: 'rejected'; reason: Error };

/**
 * Paginated data state
 */
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type PaginatedState<T> =
  | { status: 'idle' }
  | { status: 'loading'; page: number }
  | {
      status: 'success';
      items: T[];
      meta: PaginationMeta;
      cachedAt: Date;
    }
  | { status: 'error'; error: Error; lastPage?: number };

/**
 * Filter state for lists
 */
export interface FilterState<T> {
  active: boolean;
  criteria: Partial<T>;
  appliedAt?: Date;
}

/**
 * Sort state for tables
 */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Complete table state combining pagination, filtering, and sorting
 */
export interface TableState<T> {
  data: LoadingState<T[]>;
  pagination: PaginationMeta;
  filter: FilterState<T>;
  sort: SortState;
  selection: Set<string>;
}

/**
 * Modal/Dialog state
 */
export type ModalState<T = unknown> =
  | { isOpen: false }
  | { isOpen: true; data?: T; mode: 'create' | 'edit' | 'view' | 'confirm' };

/**
 * Notification state
 */
export type NotificationState =
  | { type: 'success'; message: string; duration?: number }
  | { type: 'error'; message: string; error?: Error; duration?: number }
  | { type: 'warning'; message: string; duration?: number }
  | { type: 'info'; message: string; duration?: number };

/**
 * File upload state
 */
export type FileUploadState =
  | { status: 'idle' }
  | { status: 'selecting' }
  | { status: 'uploading'; progress: number; fileName: string }
  | { status: 'success'; url: string; fileName: string }
  | { status: 'error'; error: Error; fileName?: string };

/**
 * Connection state for real-time features
 */
export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'connected'; connectedAt: Date }
  | { status: 'disconnected'; reason?: string; lastConnected?: Date }
  | { status: 'error'; error: Error };

/**
 * Type guards for state checking
 */
export function isLoadingState<T>(
  state: LoadingState<T>,
): state is Extract<LoadingState<T>, { status: 'loading' }> {
  return state.status === 'loading';
}

export function isSuccessState<T>(
  state: LoadingState<T>,
): state is Extract<LoadingState<T>, { status: 'success' }> {
  return state.status === 'success';
}

export function isErrorState<T>(
  state: LoadingState<T>,
): state is Extract<LoadingState<T>, { status: 'error' }> {
  return state.status === 'error';
}

export function isEditMode<T>(
  state: FormState<T>,
): state is Extract<FormState<T>, { mode: 'edit' }> {
  return state.mode === 'edit';
}

export function isCreateMode<T>(
  state: FormState<T>,
): state is Extract<FormState<T>, { mode: 'create' }> {
  return state.mode === 'create';
}

/**
 * State transition helpers
 */
export function toLoadingState<T>(): Extract<LoadingState<T>, { status: 'loading' }> {
  return { status: 'loading' };
}

export function toSuccessState<T>(data: T): Extract<LoadingState<T>, { status: 'success' }> {
  return { status: 'success', data, timestamp: new Date() };
}

export function toErrorState<T>(error: Error): Extract<LoadingState<T>, { status: 'error' }> {
  return { status: 'error', error, timestamp: new Date() };
}

/**
 * Initial states
 */
export const initialLoadingState: LoadingState<any> = { status: 'idle' };

export const initialPaginationMeta: PaginationMeta = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
};

export function createInitialTableState<T>(): TableState<T> {
  return {
    data: { status: 'idle' },
    pagination: initialPaginationMeta,
    filter: { active: false, criteria: {} },
    sort: { field: 'createdAt', direction: 'desc' },
    selection: new Set(),
  };
}
