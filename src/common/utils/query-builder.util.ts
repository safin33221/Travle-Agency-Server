import { PaginationQueryDto, SortOrder } from '../dto/pagination-query.dto.js';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface DateRangeFilter {
  field: string;
  from?: string | Date;
  to?: string | Date;
}

export interface NumericRangeFilter {
  field: string;
  min?: number;
  max?: number;
}

export interface BuildPrismaQueryOptions<TQuery extends PaginationQueryDto> {
  query: TQuery;
  /** Fields searched with case-insensitive `contains` when `search` or `searchTerm` is provided */
  searchableFields?: string[];
  /** Exact-match filterable fields mapped directly from `query` if defined */
  exactFilterFields?: Array<keyof TQuery & string>;
  /** Partial case-insensitive filterable string fields mapped from `query` */
  partialFilterFields?: Array<keyof TQuery & string>;
  /** Optional date range constraints */
  dateRanges?: DateRangeFilter[];
  /** Optional numeric range constraints */
  numericRanges?: NumericRangeFilter[];
  /** Allowlisted sortable column names to prevent arbitrary SQL/field injection */
  allowedSortFields?: string[];
  /** Default sort field if none or non-allowlisted field is provided */
  defaultSortBy?: string;
  /** Default sort order ('asc' | 'desc') */
  defaultSortOrder?: SortOrder;
  /** Additional static or custom Prisma `where` conditions */
  baseWhere?: Record<string, unknown>;
}

export interface BuiltPrismaQuery {
  where: Record<string, unknown>;
  skip: number;
  take: number;
  orderBy: Record<string, SortOrder>;
  page: number;
  limit: number;
}

/**
 * Reusable query builder that converts a validated query DTO into a safe Prisma
 * `{ where, skip, take, orderBy }` object with allowlisted sorting, multi-field search,
 * exact/partial filters, and date/numeric ranges.
 */
export function buildPrismaQuery<TQuery extends PaginationQueryDto>(
  options: BuildPrismaQueryOptions<TQuery>,
): BuiltPrismaQuery {
  const {
    query,
    searchableFields = [],
    exactFilterFields = [],
    partialFilterFields = [],
    dateRanges = [],
    numericRanges = [],
    allowedSortFields = ['createdAt', 'updatedAt'],
    defaultSortBy = 'createdAt',
    defaultSortOrder = 'desc',
    baseWhere = {},
  } = options;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { ...baseWhere };

  // 1. Exact-match filters
  for (const field of exactFilterFields) {
    const value = query[field];
    if (value !== undefined && value !== null && value !== '') {
      where[field] = value;
    }
  }

  // 2. Partial case-insensitive string filters
  for (const field of partialFilterFields) {
    const value = query[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      where[field] = {
        contains: value.trim(),
        mode: 'insensitive',
      };
    }
  }

  // 3. Multi-field text search (`search` or `searchTerm`)
  const rawSearch = (query.search ?? query.searchTerm ?? '').trim();
  if (rawSearch.length > 0 && searchableFields.length > 0) {
    where['OR'] = searchableFields.map((field) => ({
      [field]: {
        contains: rawSearch,
        mode: 'insensitive',
      },
    }));
  }

  // 4. Date range filters
  for (const range of dateRanges) {
    const condition: Record<string, Date> = {};
    if (range.from) {
      const fromDate = new Date(range.from);
      if (!Number.isNaN(fromDate.getTime())) {
        condition['gte'] = fromDate;
      }
    }
    if (range.to) {
      const toDate = new Date(range.to);
      if (!Number.isNaN(toDate.getTime())) {
        condition['lte'] = toDate;
      }
    }
    if (Object.keys(condition).length > 0) {
      where[range.field] = condition;
    }
  }

  // 5. Numeric range filters
  for (const range of numericRanges) {
    const condition: Record<string, number> = {};
    if (range.min !== undefined && !Number.isNaN(Number(range.min))) {
      condition['gte'] = Number(range.min);
    }
    if (range.max !== undefined && !Number.isNaN(Number(range.max))) {
      condition['lte'] = Number(range.max);
    }
    if (Object.keys(condition).length > 0) {
      where[range.field] = condition;
    }
  }

  // 6. Safe allowlisted sorting
  const requestedSortBy = query.sortBy?.trim();
  const safeSortBy =
    requestedSortBy && allowedSortFields.includes(requestedSortBy)
      ? requestedSortBy
      : defaultSortBy;

  const safeSortOrder: SortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc'
      ? query.sortOrder
      : defaultSortOrder;

  return {
    where,
    skip,
    take: limit,
    orderBy: { [safeSortBy]: safeSortOrder },
    page,
    limit,
  };
}

/**
 * Formats a standardized paginated API response with navigation flags.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

