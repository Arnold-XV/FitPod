/**
 * Result type for error handling across layers
 * AR-17: Error antar lapisan memakai Result dan AppError bertipe
 */

export type AppErrorType =
  | 'SessionExpired'
  | 'AccessDenied'
  | 'NotFound'
  | 'Conflict'
  | 'RateLimited'
  | 'PodUnreachable'
  | 'ValidationFailed'
  | 'RevocationPending'
  | 'NetworkError'
  | 'Unknown';

export interface AppError {
  type: AppErrorType;
  message: string;
  details?: unknown;
}

export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const success = <T>(value: T): Result<T> => ({
  ok: true,
  value,
});

export const failure = <T>(error: AppError): Result<T> => ({
  ok: false,
  error,
});

export const appError = (
  type: AppErrorType,
  message: string,
  details?: unknown
): AppError => ({
  type,
  message,
  details,
});
