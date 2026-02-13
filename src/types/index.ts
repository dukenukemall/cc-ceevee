// Shared TypeScript types

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
