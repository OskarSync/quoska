export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export function success<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function failure<T>(error: string): ApiResponse<T> {
  return { data: null, error };
}
