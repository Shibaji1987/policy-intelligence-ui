import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface ApiError {
  code: string;
  message: string;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const apiError: ApiError = {
        code: error.error?.code ?? 'NETWORK_ERROR',
        message:
          error.error?.message ??
          'The service could not be reached. Confirm that the backend is running.'
      };
      return throwError(() => apiError);
    })
  );
