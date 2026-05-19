export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};
