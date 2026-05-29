export class PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;

  constructor(data: T[], total: number, page: number, limit: number, message = 'OK') {
    this.data = data;
    this.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    this.message = message;
  }
}
