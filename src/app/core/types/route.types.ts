/**
 * Template literal types for type-safe routing
 */

import { ProjectId, StaffId, SupplierId, ClientId, ContractorId, TaskId } from './branded.types';

/**
 * Base routes (no parameters)
 */
export type BaseRoute =
  | '/'
  | '/dashboard'
  | '/projects'
  | '/staff'
  | '/suppliers'
  | '/clients'
  | '/contractors'
  | '/stock'
  | '/materials'
  | '/tasks'
  | '/roles'
  | '/reports'
  | '/settings';

/**
 * Parameterized routes
 */
export type ProjectRoute = `/projects/${string}`;
export type StaffRoute = `/staff/${string}`;
export type SupplierRoute = `/suppliers/${string}`;
export type ClientRoute = `/clients/${string}`;
export type ContractorRoute = `/contractors/${string}`;
export type TaskRoute = `/tasks/${string}`;

/**
 * Nested routes
 */
export type ProjectNestedRoute =
  | `/projects/${string}/phases`
  | `/projects/${string}/steps`
  | `/projects/${string}/tasks`
  | `/projects/${string}/stock`
  | `/projects/${string}/contractors`
  | `/projects/${string}/boq`;

/**
 * All possible app routes
 */
export type AppRoute =
  | BaseRoute
  | ProjectRoute
  | StaffRoute
  | SupplierRoute
  | ClientRoute
  | ContractorRoute
  | TaskRoute
  | ProjectNestedRoute;

/**
 * Route parameter extraction
 */
export type RouteParams<T extends AppRoute> = T extends `/projects/${infer Id}`
  ? { projectId: ProjectId }
  : T extends `/projects/${infer Id}/phases`
    ? { projectId: ProjectId }
    : T extends `/projects/${infer Id}/steps`
      ? { projectId: ProjectId }
      : T extends `/projects/${infer Id}/tasks`
        ? { projectId: ProjectId }
        : T extends `/projects/${infer Id}/stock`
          ? { projectId: ProjectId }
          : T extends `/projects/${infer Id}/contractors`
            ? { projectId: ProjectId }
            : T extends `/projects/${infer Id}/boq`
              ? { projectId: ProjectId }
              : T extends `/staff/${infer Id}`
                ? { staffId: StaffId }
                : T extends `/suppliers/${infer Id}`
                  ? { supplierId: SupplierId }
                  : T extends `/clients/${infer Id}`
                    ? { clientId: ClientId }
                    : T extends `/contractors/${infer Id}`
                      ? { contractorId: ContractorId }
                      : T extends `/tasks/${infer Id}`
                        ? { taskId: TaskId }
                        : never;

/**
 * Route builder functions
 */
export function projectRoute(id: ProjectId): ProjectRoute {
  return `/projects/${id}`;
}

export function projectPhasesRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/phases`;
}

export function projectStepsRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/steps`;
}

export function projectTasksRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/tasks`;
}

export function projectStockRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/stock`;
}

export function projectContractorsRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/contractors`;
}

export function projectBOQRoute(id: ProjectId): ProjectNestedRoute {
  return `/projects/${id}/boq`;
}

export function staffRoute(id: StaffId): StaffRoute {
  return `/staff/${id}`;
}

export function supplierRoute(id: SupplierId): SupplierRoute {
  return `/suppliers/${id}`;
}

export function clientRoute(id: ClientId): ClientRoute {
  return `/clients/${id}`;
}

export function contractorRoute(id: ContractorId): ContractorRoute {
  return `/contractors/${id}`;
}

export function taskRoute(id: TaskId): TaskRoute {
  return `/tasks/${id}`;
}

/**
 * Type guard to check if a string is a valid app route
 */
export function isValidAppRoute(path: string): path is AppRoute {
  // Base routes
  const baseRoutes: BaseRoute[] = [
    '/',
    '/dashboard',
    '/projects',
    '/staff',
    '/suppliers',
    '/clients',
    '/contractors',
    '/stock',
    '/materials',
    '/tasks',
    '/roles',
    '/reports',
    '/settings',
  ];

  if (baseRoutes.includes(path as BaseRoute)) {
    return true;
  }

  // Parameterized routes
  const patterns = [
    /^\/projects\/[^\/]+$/,
    /^\/projects\/[^\/]+\/(phases|steps|tasks|stock|contractors|boq)$/,
    /^\/staff\/[^\/]+$/,
    /^\/suppliers\/[^\/]+$/,
    /^\/clients\/[^\/]+$/,
    /^\/contractors\/[^\/]+$/,
    /^\/tasks\/[^\/]+$/,
  ];

  return patterns.some((pattern) => pattern.test(path));
}

/**
 * Extract route parameters from a path
 */
export function extractRouteParams<T extends AppRoute>(route: T): RouteParams<T> {
  const projectMatch = route.match(/^\/projects\/([^\/]+)/);
  if (projectMatch) {
    return { projectId: projectMatch[1] as ProjectId } as RouteParams<T>;
  }

  const staffMatch = route.match(/^\/staff\/([^\/]+)$/);
  if (staffMatch) {
    return { staffId: staffMatch[1] as StaffId } as RouteParams<T>;
  }

  const supplierMatch = route.match(/^\/suppliers\/([^\/]+)$/);
  if (supplierMatch) {
    return { supplierId: supplierMatch[1] as SupplierId } as RouteParams<T>;
  }

  const clientMatch = route.match(/^\/clients\/([^\/]+)$/);
  if (clientMatch) {
    return { clientId: clientMatch[1] as ClientId } as RouteParams<T>;
  }

  const contractorMatch = route.match(/^\/contractors\/([^\/]+)$/);
  if (contractorMatch) {
    return { contractorId: contractorMatch[1] as ContractorId } as RouteParams<T>;
  }

  const taskMatch = route.match(/^\/tasks\/([^\/]+)$/);
  if (taskMatch) {
    return { taskId: taskMatch[1] as TaskId } as RouteParams<T>;
  }

  return {} as RouteParams<T>;
}
