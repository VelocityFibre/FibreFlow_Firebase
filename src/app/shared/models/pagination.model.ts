export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class PaginationHelper {
  static createDefault(pageSize = 10): PaginationParams {
    return {
      page: 1,
      pageSize,
      sortDirection: 'desc',
    };
  }

  static calculateTotalPages(total: number, pageSize: number): number {
    return Math.ceil(total / pageSize);
  }

  static getOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  static paginate<T>(items: T[], params: PaginationParams): PaginatedResponse<T> {
    const start = this.getOffset(params.page, params.pageSize);
    const end = start + params.pageSize;

    return {
      data: items.slice(start, end),
      total: items.length,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: this.calculateTotalPages(items.length, params.pageSize),
    };
  }
}
