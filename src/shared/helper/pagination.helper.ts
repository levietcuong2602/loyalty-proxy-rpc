import { PaginatedResponse, Pagination } from '../types/common';

export const paginate = <T>(
  items: T[],
  totalCount: number,
  limit: number,
  page: number,
): PaginatedResponse<T> => {
  const total = totalCount;
  const totalPages = Math.ceil(total / limit);
  const currentPage = page;
  const perPage = limit;
  const from = (currentPage - 1) * perPage + 1;
  const to = (currentPage - 1) * perPage + items.length;
  const hasNextPage = page < Math.ceil(totalCount / limit);

  const pagination = new Pagination(
    total,
    totalPages,
    currentPage,
    perPage,
    from,
    to,
    hasNextPage,
  );
  return new PaginatedResponse<T>(items, pagination);
};
