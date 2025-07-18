export class Pagination {
  total: number;
  pagesCount: number;
  currentPage: number;
  perPage: number;
  from: number;
  to: number;
  hasMore: boolean;

  constructor(
    total: number,
    pagesCount: number,
    currentPage: number,
    perPage: number,
    from: number,
    to: number,
    hasMore: boolean,
  ) {
    this.total = total;
    this.pagesCount = pagesCount;
    this.currentPage = currentPage;
    this.perPage = perPage;
    this.from = from;
    this.to = to;
    this.hasMore = hasMore;
  }
}

export class PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;

  constructor(data: T[], pagination: Pagination) {
    this.items = data;
    this.pagination = pagination;
  }
}
